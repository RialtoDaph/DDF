"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requiresUnitVolume } from "./units";
import type { ItemCategory, MovementReason, MovementType } from "@/lib/database.types";

export async function createItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }
  if (!profile.outlet_id) {
    return { error: "Kein Standort zugeordnet." };
  }

  const unit = String(formData.get("unit") ?? "").trim();
  const unitVolumeMl = formData.get("unit_volume_ml") ? Number(formData.get("unit_volume_ml")) : null;
  if (requiresUnitVolume(unit) && !unitVolumeMl) {
    return { error: "Bitte Volumen pro Flasche (ml) angeben — sonst wird die Rezeptkalkulation falsch." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_items").insert({
    name: String(formData.get("name") ?? "").trim(),
    category: formData.get("category") as ItemCategory,
    unit,
    unit_volume_ml: unitVolumeMl,
    par_level: Number(formData.get("par_level") ?? 0),
    current_stock: Number(formData.get("current_stock") ?? 0),
    purchase_price: formData.get("purchase_price") ? Number(formData.get("purchase_price")) : null,
    is_perishable: formData.get("is_perishable") === "on",
    default_supplier_id: String(formData.get("default_supplier_id") ?? "") || null,
    outlet_id: profile.outlet_id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function recordMovement(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const itemId = String(formData.get("item_id") ?? "");
  const reason = formData.get("reason") as MovementReason;
  // "Korrektur" can go either way (a physical count can turn up more stock
  // than the system shows, not just less) — restock is always "in", usage
  // and waste are always "out", and adjustment follows whichever direction
  // was picked, defaulting to "out" to match the previous (decrease-only)
  // behavior if the field is somehow missing.
  const type: MovementType =
    reason === "restock" ? "in" : reason === "adjustment" && formData.get("adjustment_direction") === "in" ? "in" : "out";

  if (reason === "adjustment" && !canManageMasterData(profile.role)) {
    return { error: "Bestandskorrekturen erfordern Freigabe durch Manager oder Owner." };
  }

  const quantity = Number(formData.get("quantity") ?? 0);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Bitte eine gueltige Menge groesser als 0 angeben." };
  }

  const { error } = await supabase.from("stock_movements").insert({
    item_id: itemId,
    type,
    quantity,
    reason,
    user_id: profile.id,
    notes: String(formData.get("notes") ?? "") || null,
    expiry_date: formData.get("expiry_date") ? String(formData.get("expiry_date")) : null,
    supplier_id: formData.get("supplier_id") ? String(formData.get("supplier_id")) : null,
  });

  if (error) {
    return { error: error.message };
  }

  if (reason === "adjustment") {
    await logAudit(supabase, profile.id, "stock_adjustment", "stock_movements", { item_id: itemId, quantity, type });
  }

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const id = String(formData.get("id") ?? "");
  const unit = String(formData.get("unit") ?? "").trim();
  const unitVolumeMl = formData.get("unit_volume_ml") ? Number(formData.get("unit_volume_ml")) : null;
  if (requiresUnitVolume(unit) && !unitVolumeMl) {
    return { error: "Bitte Volumen pro Flasche (ml) angeben — sonst wird die Rezeptkalkulation falsch." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      category: formData.get("category") as ItemCategory,
      unit,
      unit_volume_ml: unitVolumeMl,
      par_level: Number(formData.get("par_level") ?? 0),
      purchase_price: formData.get("purchase_price") ? Number(formData.get("purchase_price")) : null,
      is_perishable: formData.get("is_perishable") === "on",
      default_supplier_id: String(formData.get("default_supplier_id") ?? "") || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/inventory/${id}`);
  revalidatePath("/inventory");
  // Cocktail cost/margin on Menu & Rezepte reads this item's price/unit
  // through its recipe rows — without this, editing an ingredient's price
  // leaves every menu item using it showing a stale cost until something
  // else happens to revalidate that page.
  revalidatePath("/menu", "layout");
  return { success: true };
}

export async function deleteItem(itemId: string) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_items").delete().eq("id", itemId);
  if (error) {
    return { error: error.message };
  }

  await logAudit(supabase, profile.id, "inventory_item_delete", "inventory_items", { item_id: itemId });

  revalidatePath("/inventory");
  revalidatePath("/menu", "layout");
  redirect("/inventory");
}
