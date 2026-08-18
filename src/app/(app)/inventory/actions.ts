"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import type { ItemCategory, MovementReason, MovementType } from "@/lib/database.types";

export async function createItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }
  if (!profile.outlet_id) {
    return { error: "Kein Standort zugeordnet." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_items").insert({
    name: String(formData.get("name") ?? "").trim(),
    category: formData.get("category") as ItemCategory,
    unit: String(formData.get("unit") ?? "").trim(),
    par_level: Number(formData.get("par_level") ?? 0),
    current_stock: Number(formData.get("current_stock") ?? 0),
    purchase_price: formData.get("purchase_price") ? Number(formData.get("purchase_price")) : null,
    is_perishable: formData.get("is_perishable") === "on",
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
  const type: MovementType = reason === "restock" ? "in" : "out";

  if (reason === "adjustment" && !canManageMasterData(profile.role)) {
    return { error: "Bestandskorrekturen erfordern Freigabe durch Manager oder Owner." };
  }

  const { error } = await supabase.from("stock_movements").insert({
    item_id: itemId,
    type,
    quantity: Number(formData.get("quantity") ?? 0),
    reason,
    user_id: profile.id,
    notes: String(formData.get("notes") ?? "") || null,
    expiry_date: formData.get("expiry_date") ? String(formData.get("expiry_date")) : null,
    supplier_id: formData.get("supplier_id") ? String(formData.get("supplier_id")) : null,
  });

  if (error) {
    return { error: error.message };
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      category: formData.get("category") as ItemCategory,
      unit: String(formData.get("unit") ?? "").trim(),
      par_level: Number(formData.get("par_level") ?? 0),
      purchase_price: formData.get("purchase_price") ? Number(formData.get("purchase_price")) : null,
      is_perishable: formData.get("is_perishable") === "on",
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/inventory/${id}`);
  revalidatePath("/inventory");
  return { success: true };
}
