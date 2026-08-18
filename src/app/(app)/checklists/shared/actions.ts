"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData, canApprove } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { defaultTemplateItems } from "./lib";
import type { ChecklistType } from "@/lib/database.types";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function createDefaultTemplate(type: ChecklistType) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role) || !profile.outlet_id) {
    return { error: "Keine Berechtigung." };
  }

  const supabase = await createClient();

  // Idempotent: the button is reachable from both the checklist page and
  // settings, and a double click used to leave the outlet with two templates
  // of the same name — which then broke every read of that checklist.
  const { data: existing } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("outlet_id", profile.outlet_id)
    .eq("name", type)
    .limit(1);

  if (existing && existing.length > 0) {
    revalidatePath(`/checklists/${type}`);
    revalidatePath("/settings/checklists");
    return { success: true };
  }

  const { error } = await supabase.from("checklist_templates").insert({
    name: type,
    outlet_id: profile.outlet_id,
    items: defaultTemplateItems(type),
  });

  if (error) return { error: error.message };
  revalidatePath(`/checklists/${type}`);
  revalidatePath("/settings/checklists");
  return { success: true };
}

export async function saveItemResult(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const submissionId = String(formData.get("submission_id"));
  const itemText = String(formData.get("item_text"));
  const checked = formData.get("checked") === "true";
  const photo = formData.get("photo") as File | null;
  const takenAt = formData.get("taken_at") ? String(formData.get("taken_at")) : null;

  let photoPath: string | null = null;

  if (photo && photo.size > 0) {
    const { data: submission } = await supabase
      .from("checklist_submissions")
      .select("id, template_id, checklist_templates(outlet_id)")
      .eq("id", submissionId)
      .single();

    const outletId = (submission?.checklist_templates as unknown as { outlet_id: string } | null)?.outlet_id;
    if (!outletId) return { error: "Vorlage nicht gefunden." };

    photoPath = `${outletId}/${submissionId}/${slugify(itemText)}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("checklist-photos")
      .upload(photoPath, photo, { contentType: "image/jpeg" });

    if (uploadError) return { error: uploadError.message };
  }

  const { error } = await supabase
    .from("checklist_item_results")
    .upsert(
      {
        submission_id: submissionId,
        item_text: itemText,
        checked,
        ...(photoPath ? { photo_url: photoPath, photo_taken_at: takenAt } : {}),
      },
      { onConflict: "submission_id,item_text" },
    );

  if (error) return { error: error.message };

  revalidatePath(`/checklists`);
  return { success: true, photoPath };
}

export async function updateSubmissionMeta(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();
  const submissionId = String(formData.get("submission_id"));

  const { error } = await supabase
    .from("checklist_submissions")
    .update({
      shift: String(formData.get("shift") ?? "") || null,
      cash_count: formData.get("cash_count") ? Number(formData.get("cash_count")) : null,
      incident_notes: String(formData.get("incident_notes") ?? "") || null,
    })
    .eq("id", submissionId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function saveHandoverNote(formData: FormData) {
  const profile = await requireProfile();
  if (!profile.outlet_id) return { error: "Kein Standort zugeordnet." };
  const supabase = await createClient();

  const { error } = await supabase.from("handover_notes").insert({
    outlet_id: profile.outlet_id,
    user_id: profile.id,
    shift: String(formData.get("shift") ?? "") || null,
    content: String(formData.get("content") ?? ""),
  });

  if (error) return { error: error.message };
  revalidatePath("/checklists/closing");
  return { success: true };
}

export async function submitChecklist(submissionId: string, type: ChecklistType) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_submissions")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", submissionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/checklists/${type}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function approveChecklist(submissionId: string, type: ChecklistType) {
  const profile = await requireProfile();
  if (!canApprove(profile.role)) return { error: "Keine Berechtigung." };
  const supabase = await createClient();

  const { error } = await supabase
    .from("checklist_submissions")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: profile.id })
    .eq("id", submissionId);

  if (error) return { error: error.message };
  await logAudit(supabase, profile.id, "checklist_approved", "checklist_submissions", { submission_id: submissionId });
  revalidatePath(`/checklists/${type}`);
  return { success: true };
}
