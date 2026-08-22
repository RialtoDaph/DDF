"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { syncBestellungChecklistItem } from "@/lib/orderChecklistSync";
import type { ActionState } from "@/lib/actionState";

export async function createOrderItem(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  if (!profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const itemName = String(formData.get("item_name") ?? "").trim();
  if (!itemName) return { error: "Bitte einen Artikel angeben." };

  const supabase = await createClient();
  const { error } = await supabase.from("order_list_items").insert({
    outlet_id: profile.outlet_id,
    item_name: itemName,
    quantity: String(formData.get("quantity") ?? "").trim() || null,
    supplier_name: String(formData.get("supplier_name") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  // A new open entry reopens an already-"done" Wochencheck Bestellung item.
  await syncBestellungChecklistItem(supabase, profile.outlet_id);
  revalidatePath("/orders");
  revalidatePath("/checklists/weekly");
  return { success: true };
}

export async function updateOrderItem(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const id = String(formData.get("id") ?? "");
  const itemName = String(formData.get("item_name") ?? "").trim();
  if (!id || !itemName) return { error: "Bitte einen Artikel angeben." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("order_list_items")
    .update({
      item_name: itemName,
      quantity: String(formData.get("quantity") ?? "").trim() || null,
      supplier_name: String(formData.get("supplier_name") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/orders");
  return { success: true };
}

export async function setOrderItemStatus(id: string, status: "open" | "ordered"): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("order_list_items")
    .update(
      status === "ordered"
        ? { status, ordered_at: new Date().toISOString(), ordered_by: profile.id }
        : { status, ordered_at: null, ordered_by: null },
    )
    .eq("id", id);

  if (error) return { error: error.message };

  if (profile.outlet_id) await syncBestellungChecklistItem(supabase, profile.outlet_id);
  revalidatePath("/orders");
  revalidatePath("/checklists/weekly");
  return {};
}

export async function deleteOrderItem(id: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("order_list_items").delete().eq("id", id);
  if (error) return { error: error.message };

  if (profile.outlet_id) await syncBestellungChecklistItem(supabase, profile.outlet_id);
  revalidatePath("/orders");
  revalidatePath("/checklists/weekly");
  return {};
}
