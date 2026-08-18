"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";

export async function createSection(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };
  if (!profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const category = String(formData.get("category") ?? "").trim() || "Allgemein";
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Titel fehlt." };

  const supabase = await createClient();

  // New entries land at the end of their category.
  const { data: last } = await supabase
    .from("handbook_sections")
    .select("sort_order")
    .eq("outlet_id", profile.outlet_id)
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("handbook_sections").insert({
    outlet_id: profile.outlet_id,
    category,
    title,
    body: String(formData.get("body") ?? ""),
    sort_order: (last?.[0]?.sort_order ?? -1) + 1,
    updated_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/handbuch");
  return { success: true };
}

export async function updateSection(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Titel fehlt." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("handbook_sections")
    .update({
      category: String(formData.get("category") ?? "").trim() || "Allgemein",
      title,
      body: String(formData.get("body") ?? ""),
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/handbuch");
  return { success: true };
}

export async function removeSection(id: string) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const supabase = await createClient();
  const { error } = await supabase.from("handbook_sections").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/handbuch");
  return { success: true };
}

/** Swaps a section with its neighbour inside the same category. */
export async function moveSection(id: string, direction: "up" | "down") {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("handbook_sections")
    .select("id, outlet_id, category, sort_order")
    .eq("id", id)
    .single();

  if (!current) return { error: "Abschnitt nicht gefunden." };

  const siblings = supabase
    .from("handbook_sections")
    .select("id, sort_order")
    .eq("outlet_id", current.outlet_id)
    .eq("category", current.category);

  const { data: neighbours } =
    direction === "down"
      ? await siblings.gt("sort_order", current.sort_order).order("sort_order", { ascending: true }).limit(1)
      : await siblings.lt("sort_order", current.sort_order).order("sort_order", { ascending: false }).limit(1);

  const neighbour = neighbours?.[0];
  if (!neighbour) return { success: true };

  // Two writes rather than a swap expression: PostgREST has no multi-row
  // update with per-row values, and the pair is small enough that a torn
  // write would only misorder two entries an editor can fix by clicking again.
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("handbook_sections").update({ sort_order: neighbour.sort_order }).eq("id", current.id),
    supabase.from("handbook_sections").update({ sort_order: current.sort_order }).eq("id", neighbour.id),
  ]);

  if (e1 || e2) return { error: (e1 ?? e2)!.message };

  revalidatePath("/handbuch");
  return { success: true };
}
