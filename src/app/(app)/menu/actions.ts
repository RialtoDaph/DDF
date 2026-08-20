"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";

export async function createMenuItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      name: String(formData.get("name") ?? "").trim(),
      sale_price: Number(formData.get("sale_price") ?? 0),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/menu");
  redirect(`/menu/${data.id}`);
}

export async function updateMenuItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      sale_price: Number(formData.get("sale_price") ?? 0),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/menu/${id}`);
  revalidatePath("/menu");
  return { success: true };
}

export async function addIngredient(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const menuItemId = String(formData.get("menu_item_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").insert({
    menu_item_id: menuItemId,
    inventory_item_id: String(formData.get("inventory_item_id") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
  });

  if (error) return { error: error.message };

  revalidatePath(`/menu/${menuItemId}`);
  return { success: true };
}

export async function removeIngredient(recipeId: string, menuItemId: string) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) return { error: error.message };

  revalidatePath(`/menu/${menuItemId}`);
  return { success: true };
}
