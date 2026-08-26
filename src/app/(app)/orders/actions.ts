"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { syncBestellungChecklistItem } from "@/lib/orderChecklistSync";
import type { ActionState } from "@/lib/actionState";
import type { Database } from "@/lib/database.types";

// Free-typed supplier names fragment fast: "Chefs Kulinar" vs "chefs
// kulinar" vs "Chefs  Kulinar" all read as the same supplier to a person but
// as distinct strings to the Lieferant filter. If the trimmed input
// case-insensitively matches a name already in use (in this outlet's order
// list or the Lieferanten master list), reuse that exact spelling instead
// of the freshly typed one, so near-duplicates stop piling up.
async function canonicalSupplierName(
  supabase: SupabaseClient<Database>,
  outletId: string,
  typed: string,
): Promise<string> {
  const [{ data: fromOrders }, { data: fromSuppliers }] = await Promise.all([
    supabase
      .from("order_list_items")
      .select("supplier_name")
      .eq("outlet_id", outletId)
      .ilike("supplier_name", typed)
      .limit(1),
    supabase.from("suppliers").select("name").ilike("name", typed).limit(1),
  ]);

  return fromOrders?.[0]?.supplier_name ?? fromSuppliers?.[0]?.name ?? typed;
}

export async function createOrderItem(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  if (!profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const itemName = String(formData.get("item_name") ?? "").trim();
  if (!itemName) return { error: "Bitte einen Artikel angeben." };

  const supabase = await createClient();
  const supplierTyped = String(formData.get("supplier_name") ?? "").trim();
  const supplierName = supplierTyped
    ? await canonicalSupplierName(supabase, profile.outlet_id, supplierTyped)
    : null;

  const { error } = await supabase.from("order_list_items").insert({
    outlet_id: profile.outlet_id,
    item_name: itemName,
    quantity: String(formData.get("quantity") ?? "").trim() || null,
    supplier_name: supplierName,
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
  const profile = await requireProfile();
  const id = String(formData.get("id") ?? "");
  const itemName = String(formData.get("item_name") ?? "").trim();
  if (!id || !itemName) return { error: "Bitte einen Artikel angeben." };

  const supabase = await createClient();
  const supplierTyped = String(formData.get("supplier_name") ?? "").trim();
  const supplierName =
    supplierTyped && profile.outlet_id
      ? await canonicalSupplierName(supabase, profile.outlet_id, supplierTyped)
      : supplierTyped || null;

  const { error } = await supabase
    .from("order_list_items")
    .update({
      item_name: itemName,
      quantity: String(formData.get("quantity") ?? "").trim() || null,
      supplier_name: supplierName,
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

  const { data, error } = await supabase
    .from("order_list_items")
    .update(
      status === "ordered"
        ? { status, ordered_at: new Date().toISOString(), ordered_by: profile.id }
        : { status, ordered_at: null, ordered_by: null },
    )
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  // RLS can silently match zero rows (no error, no update) instead of
  // failing loudly — without this check the checkbox looks "saved" until
  // the next reload shows the unchanged status.
  if (!data) return { error: "Eintrag nicht gefunden oder keine Berechtigung." };

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
