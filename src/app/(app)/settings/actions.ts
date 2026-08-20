"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import type { ActionState } from "@/lib/actionState";
import type { ChecklistTemplateItem } from "@/lib/database.types";

export async function createEvent(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };
  if (!profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const label = String(formData.get("label") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  if (!label || !eventDate) return { error: "Bitte Bezeichnung und Datum angeben." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .insert({ outlet_id: profile.outlet_id, label, event_date: eventDate, created_by: profile.id });

  if (error) return { error: error.message };

  revalidatePath("/settings/checklists");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteEvent(eventId: string) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return { error: error.message };

  revalidatePath("/settings/checklists");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addTemplateItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const templateId = String(formData.get("template_id") ?? "");
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("name, items")
    .eq("id", templateId)
    .single();
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

  // Staff fill the checklist out on /checklists/[type], not here — without
  // this a newly added item only appears in Settings until something else
  // happens to revalidate that route, so it looks like the add did nothing.
  revalidatePath(`/checklists/${template.name}`);
  revalidatePath("/settings/checklists");
  return { success: true };
}

export async function removeTemplateItem(templateId: string, index: number) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const supabase = await createClient();
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("name, items")
    .eq("id", templateId)
    .single();
  if (!template) return { error: "Vorlage nicht gefunden." };

  const items = ((template.items as ChecklistTemplateItem[]) ?? []).filter((_, i) => i !== index);
  const { error } = await supabase.from("checklist_templates").update({ items }).eq("id", templateId);
  if (error) return { error: error.message };

  revalidatePath(`/checklists/${template.name}`);
  revalidatePath("/settings/checklists");
  return { success: true };
}

export async function updateTemplateItem(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const templateId = String(formData.get("template_id") ?? "");
  const index = Number(formData.get("index") ?? -1);
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("name, items")
    .eq("id", templateId)
    .single();
  if (!template) return { error: "Vorlage nicht gefunden." };

  const items = (template.items as ChecklistTemplateItem[]) ?? [];
  if (index < 0 || index >= items.length) return { error: "Punkt nicht gefunden." };

  items[index] = {
    text: String(formData.get("text") ?? "").trim(),
    requires_photo: formData.get("requires_photo") === "on",
    category: String(formData.get("category") ?? "allgemein").trim() || "allgemein",
  };

  const { error } = await supabase.from("checklist_templates").update({ items }).eq("id", templateId);
  if (error) return { error: error.message };

  revalidatePath(`/checklists/${template.name}`);
  revalidatePath("/settings/checklists");
  return { success: true };
}

export async function moveTemplateItem(templateId: string, index: number, direction: "up" | "down") {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };

  const supabase = await createClient();
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("name, items")
    .eq("id", templateId)
    .single();
  if (!template) return { error: "Vorlage nicht gefunden." };

  const items = (template.items as ChecklistTemplateItem[]) ?? [];
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return { success: true };

  [items[index], items[target]] = [items[target], items[index]];
  const { error } = await supabase.from("checklist_templates").update({ items }).eq("id", templateId);
  if (error) return { error: error.message };

  revalidatePath(`/checklists/${template.name}`);
  revalidatePath("/settings/checklists");
  return { success: true };
}
