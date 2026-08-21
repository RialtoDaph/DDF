"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function createMenuItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      name,
      sale_price: Number(formData.get("sale_price") ?? 0),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit(supabase, profile.id, "menu_item_create", "menu_items", { menu_item_id: data.id, name });

  revalidatePath("/menu");
  redirect(`/menu/${data.id}`);
}

export async function updateMenuItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const salePrice = Number(formData.get("sale_price") ?? 0);
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ name, sale_price: salePrice })
    .eq("id", id);

  if (error) return { error: error.message };

  await logAudit(supabase, profile.id, "menu_item_update", "menu_items", {
    menu_item_id: id,
    name,
    sale_price: salePrice,
  });

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
  const inventoryItemId = String(formData.get("inventory_item_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").insert({
    menu_item_id: menuItemId,
    inventory_item_id: inventoryItemId,
    amount: Number(formData.get("amount") ?? 0),
  });

  if (error) return { error: error.message };

  await logAudit(supabase, profile.id, "recipe_ingredient_add", "recipes", {
    menu_item_id: menuItemId,
    inventory_item_id: inventoryItemId,
  });

  revalidatePath(`/menu/${menuItemId}`);
  return { success: true };
}

export async function removeIngredient(recipeId: string, menuItemId: string) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return;

  const supabase = await createClient();
  await supabase.from("recipes").delete().eq("id", recipeId);
  await logAudit(supabase, profile.id, "recipe_ingredient_remove", "recipes", {
    recipe_id: recipeId,
    menu_item_id: menuItemId,
  });
  revalidatePath(`/menu/${menuItemId}`);
}
