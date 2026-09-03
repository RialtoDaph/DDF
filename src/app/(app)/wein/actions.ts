"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionState } from "@/lib/actionState";
import type { MovementReason } from "@/lib/database.types";

const REMOVE_REASON_LABEL: Record<string, string> = {
  usage: "verkauft/verwendet",
  waste: "Schwund/Verderb",
};

const RACK_COUNT = 15;
const SLOTS_PER_RACK = 9;

export async function createCabinet(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };
  if (!profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Namen angeben." };
  const temperatureC = formData.get("temperature_c") ? Number(formData.get("temperature_c")) : null;

  const supabase = await createClient();

  const { count } = await supabase
    .from("wine_cabinets")
    .select("id", { count: "exact", head: true })
    .eq("outlet_id", profile.outlet_id);

  const { data: cabinet, error } = await supabase
    .from("wine_cabinets")
    .insert({ outlet_id: profile.outlet_id, name, temperature_c: temperatureC, sort_order: count ?? 0 })
    .select("id")
    .single();

  if (error || !cabinet) return { error: error?.message ?? "Schrank konnte nicht angelegt werden." };

  // Seed the fixed 15x9 template up front — slots are never created
  // one-off, only assigned/cleared, so every cabinet always has the full
  // 135 rows from the moment it exists.
  const slotRows = [];
  for (let rack = 1; rack <= RACK_COUNT; rack++) {
    for (let slot = 1; slot <= SLOTS_PER_RACK; slot++) {
      slotRows.push({ cabinet_id: cabinet.id, rack_number: rack, slot_number: slot, flipped: slot % 2 === 0 });
    }
  }
  const { error: slotsError } = await supabase.from("wine_slots").insert(slotRows);
  if (slotsError) {
    // Roll back the cabinet so we don't leave an empty shell with no slots.
    await supabase.from("wine_cabinets").delete().eq("id", cabinet.id);
    return { error: slotsError.message };
  }

  await logAudit(supabase, profile.id, "wine_cabinet_create", "wine_cabinets", { cabinet_id: cabinet.id, name });

  revalidatePath("/wein");
  return { success: true };
}

export async function deleteCabinet(cabinetId: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const supabase = await createClient();
  const { error } = await supabase.from("wine_cabinets").delete().eq("id", cabinetId);
  if (error) return { error: error.message };

  await logAudit(supabase, profile.id, "wine_cabinet_delete", "wine_cabinets", { cabinet_id: cabinetId });

  revalidatePath("/wein");
  return {};
}

export async function assignBottle(
  slotId: string,
  inventoryItemId: string,
  context: { cabinetName: string; rackNumber: number; slotNumber: number },
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: slot } = await supabase.from("wine_slots").select("id, inventory_item_id").eq("id", slotId).single();
  if (!slot) return { error: "Platz nicht gefunden." };
  if (slot.inventory_item_id) return { error: "Dieser Platz ist bereits belegt." };

  const { error: updateError } = await supabase
    .from("wine_slots")
    .update({ inventory_item_id: inventoryItemId, updated_at: new Date().toISOString() })
    .eq("id", slotId);
  if (updateError) return { error: updateError.message };

  // Placing a bottle here is a real stock arrival, not just a display
  // change — records the same way a restock would anywhere else in
  // Inventar, so current_stock (via the stock_movements trigger) and this
  // physical map never drift apart.
  const { error: movementError } = await supabase.from("stock_movements").insert({
    item_id: inventoryItemId,
    type: "in",
    quantity: 1,
    reason: "restock",
    user_id: profile.id,
    notes: `Weinschrank ${context.cabinetName}, Fach ${context.rackNumber}, Platz ${context.slotNumber}`,
  });
  if (movementError) return { error: movementError.message };

  revalidatePath("/wein");
  revalidatePath("/inventory");
  return {};
}

export async function removeBottle(
  slotId: string,
  context: { cabinetName: string; rackNumber: number; slotNumber: number },
  reason: Extract<MovementReason, "usage" | "waste"> = "usage",
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: slot } = await supabase.from("wine_slots").select("id, inventory_item_id").eq("id", slotId).single();
  if (!slot) return { error: "Platz nicht gefunden." };
  if (!slot.inventory_item_id) return { error: "Dieser Platz ist bereits leer." };

  const itemId = slot.inventory_item_id;

  const { error: updateError } = await supabase
    .from("wine_slots")
    .update({ inventory_item_id: null, updated_at: new Date().toISOString() })
    .eq("id", slotId);
  if (updateError) return { error: updateError.message };

  // Selling/pouring a bottle and breaking/spoiling one both empty the slot,
  // but they mean different things for stock reporting — let the caller
  // pick which stock_movements reason applies instead of always recording
  // "usage" regardless of what actually happened to the bottle.
  const { error: movementError } = await supabase.from("stock_movements").insert({
    item_id: itemId,
    type: "out",
    quantity: 1,
    reason,
    user_id: profile.id,
    notes: `Weinschrank ${context.cabinetName}, Fach ${context.rackNumber}, Platz ${context.slotNumber} (${REMOVE_REASON_LABEL[reason]})`,
  });
  if (movementError) return { error: movementError.message };

  revalidatePath("/wein");
  revalidatePath("/inventory");
  return {};
}

export async function toggleSlotFlip(slotId: string): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const { data: slot } = await supabase.from("wine_slots").select("flipped").eq("id", slotId).single();
  if (!slot) return { error: "Platz nicht gefunden." };

  const { error } = await supabase.from("wine_slots").update({ flipped: !slot.flipped }).eq("id", slotId);
  if (error) return { error: error.message };

  revalidatePath("/wein");
  return {};
}

/** The label is a property of the wine (inventory_items), not the slot — a bottle moving racks keeps its photo. */
export async function attachLabelPhoto(formData: FormData): Promise<{ error?: string; path?: string }> {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const itemId = String(formData.get("item_id") ?? "");
  const photo = formData.get("photo") as File | null;
  if (!photo || photo.size === 0) return { error: "Kein Foto übermittelt." };

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("inventory_items")
    .select("id, outlet_id, label_photo_url")
    .eq("id", itemId)
    .single();
  if (!item) return { error: "Artikel nicht gefunden." };

  const path = `${item.outlet_id}/${itemId}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("wine-labels")
    .upload(path, photo, { contentType: "image/jpeg" });
  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase.from("inventory_items").update({ label_photo_url: path }).eq("id", itemId);
  if (updateError) return { error: updateError.message };

  // Best-effort — an old photo left behind is just a few KB of orphaned
  // storage, not worth failing the (already-saved) new photo over.
  if (item.label_photo_url) {
    await supabase.storage.from("wine-labels").remove([item.label_photo_url]);
  }

  revalidatePath("/wein");
  revalidatePath("/inventory");
  return { path };
}

export async function removeLabelPhoto(itemId: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const supabase = await createClient();
  const { data: item } = await supabase.from("inventory_items").select("label_photo_url").eq("id", itemId).single();
  if (!item?.label_photo_url) return { error: "Kein Foto vorhanden." };

  const { error } = await supabase.from("inventory_items").update({ label_photo_url: null }).eq("id", itemId);
  if (error) return { error: error.message };

  await supabase.storage.from("wine-labels").remove([item.label_photo_url]);

  revalidatePath("/wein");
  revalidatePath("/inventory");
  return {};
}
