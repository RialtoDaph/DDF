"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function createSupplier(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name,
      contact: String(formData.get("contact") ?? "") || null,
      category: String(formData.get("category") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await logAudit(supabase, profile.id, "supplier_create", "suppliers", { supplier_id: data.id, name });

  revalidatePath("/suppliers");
  redirect(`/suppliers/${data.id}`);
}

export async function updateSupplier(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      name,
      contact: String(formData.get("contact") ?? "") || null,
      category: String(formData.get("category") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await logAudit(supabase, profile.id, "supplier_update", "suppliers", { supplier_id: id, name });

  revalidatePath(`/suppliers/${id}`);
  revalidatePath("/suppliers");
  return { success: true };
}

export async function addPriceEntry(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const supplierId = String(formData.get("supplier_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const supabase = await createClient();
  const { error } = await supabase.from("supplier_price_history").insert({
    supplier_id: supplierId,
    item_id: itemId,
    price,
    valid_from: String(formData.get("valid_from") ?? new Date().toISOString().slice(0, 10)),
  });

  if (error) return { error: error.message };

  await logAudit(supabase, profile.id, "supplier_price_add", "supplier_price_history", {
    supplier_id: supplierId,
    item_id: itemId,
    price,
  });

  revalidatePath(`/suppliers/${supplierId}`);
  return { success: true };
}
