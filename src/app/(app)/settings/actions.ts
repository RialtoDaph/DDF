"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import type { ChecklistTemplateItem } from "@/lib/database.types";

export async function addTemplateItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const templateId = String(formData.get("template_id") ?? "");
  const supabase = await createClient();

  const { data: template } = await supabase.from("checklist_templates").select("items").eq("id", templateId).single();
  if (!template) return { error: "Vorlage nicht gefunden." };

  const items = (template.items as ChecklistTemplateItem[]) ?? [];
  const newItem: ChecklistTemplateItem = {
    text: String(formData.get("text") ?? "").trim(),
    requires_photo: formData.get("requires_photo") === "on",
    category: String(formData.get("category") ?? "allgemein").trim() || "allgemein",
  };

  const { error } = await supabase
    .from("checklist_templates")
    .update({ items: [...items, newItem] })
    .eq("id", templateId);

  if (error) return { error: error.message };

  revalidatePath("/settings/checklists");
  return { success: true };
}

export async function removeTemplateItem(templateId: string, index: number) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return;

  const supabase = await createClient();
  const { data: template } = await supabase.from("checklist_templates").select("items").eq("id", templateId).single();
  if (!template) return;

  const items = ((template.items as ChecklistTemplateItem[]) ?? []).filter((_, i) => i !== index);
  await supabase.from("checklist_templates").update({ items }).eq("id", templateId);

  revalidatePath("/settings/checklists");
}
