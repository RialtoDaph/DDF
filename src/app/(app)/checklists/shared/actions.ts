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
  const type = formData.get("type") ? String(formData.get("type")) : null;
  const itemText = String(formData.get("item_text"));
  const checked = formData.get("checked") === "true";
  const photo = formData.get("photo") as File | null;
  const takenAt = formData.get("taken_at") ? String(formData.get("taken_at")) : null;
  const clearPhoto = formData.get("clear_photo") === "true";

  const { data: submission } = await supabase
    .from("checklist_submissions")
    .select("id, status, checklist_templates(outlet_id)")
    .eq("id", submissionId)
    .single();

  if (!submission) return { error: "Eintrag nicht gefunden." };
  // The UI already disables inputs once readOnly is true, but that's a
  // stale prop from the last render — without this the server would still
  // accept edits to an already-submitted (or approved) report.
  if (submission.status !== "draft") {
    return { error: "Diese Checkliste ist bereits eingereicht und kann nicht mehr bearbeitet werden." };
  }

  let photoPath: string | null = null;

  if (photo && photo.size > 0) {
    const outletId = (submission.checklist_templates as unknown as { outlet_id: string } | null)?.outlet_id;
    if (!outletId) return { error: "Vorlage nicht gefunden." };

    photoPath = `${outletId}/${submissionId}/${slugify(itemText)}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("checklist-photos")
      .upload(photoPath, photo, { contentType: "image/jpeg" });

    if (uploadError) return { error: uploadError.message };
  }

  // A replaced or cleared photo (the "wrong photo, take it again" case) was
  // never actually removed before — clicking the X on CameraCapture only
  // reset local React state, so the old photo_url stayed in the DB and came
  // straight back on the next page load. Fetch it first so we can drop the
  // now-orphaned file from storage once the new row is saved.
  let previousPhotoPath: string | null = null;
  if (photoPath || clearPhoto) {
    const { data: existing } = await supabase
      .from("checklist_item_results")
      .select("photo_url")
      .eq("submission_id", submissionId)
      .eq("item_text", itemText)
      .single();
    previousPhotoPath = existing?.photo_url ?? null;
  }

  const { data: upserted, error } = await supabase
    .from("checklist_item_results")
    .upsert(
      {
        submission_id: submissionId,
        item_text: itemText,
        checked,
        ...(photoPath ? { photo_url: photoPath, photo_taken_at: takenAt } : {}),
        ...(clearPhoto ? { photo_url: null, photo_taken_at: null } : {}),
      },
      { onConflict: "submission_id,item_text" },
    )
    .select("submission_id")
    .single();

  if (error || !upserted) return { error: error?.message ?? "Speichern fehlgeschlagen." };

  if (previousPhotoPath && previousPhotoPath !== photoPath) {
    await supabase.storage.from("checklist-photos").remove([previousPhotoPath]);
  }

  if (type) revalidatePath(`/checklists/${type}`);
  return { success: true, photoPath };
}

export async function updateSubmissionMeta(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();
  const submissionId = String(formData.get("submission_id"));

  const { data: submission } = await supabase
    .from("checklist_submissions")
    .select("id, status")
    .eq("id", submissionId)
    .single();

  if (!submission) return { error: "Eintrag nicht gefunden." };
  if (submission.status !== "draft") {
    return { error: "Diese Checkliste ist bereits eingereicht und kann nicht mehr bearbeitet werden." };
  }

  const { data: updated, error } = await supabase
    .from("checklist_submissions")
    .update({
      shift: String(formData.get("shift") ?? "") || null,
      cash_count: formData.get("cash_count") ? Number(formData.get("cash_count")) : null,
      incident_notes: String(formData.get("incident_notes") ?? "") || null,
    })
    .eq("id", submissionId)
    .select("id")
    .single();

  if (error || !updated) return { error: error?.message ?? "Speichern fehlgeschlagen." };
  revalidatePath("/checklists/closing");
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
  revalidatePath("/dashboard");
  return { success: true };
}

export async function submitChecklist(submissionId: string, type: ChecklistType) {
  await requireProfile();
  const supabase = await createClient();
  // The status filter both guards against double-submitting and lets us
  // tell "already submitted by someone else" apart from a real DB error —
  // Supabase reports 0-row updates as success (error: null), so without a
  // check here the button would look like it worked either way.
  const { data: updated, error } = await supabase
    .from("checklist_submissions")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", submissionId)
    .eq("status", "draft")
    .select("id")
    .single();

  if (error || !updated) {
    return { error: error?.message ?? "Konnte nicht eingereicht werden — bereits eingereicht?" };
  }

  revalidatePath(`/checklists/${type}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function approveChecklist(submissionId: string, type: ChecklistType) {
  const profile = await requireProfile();
  if (!canApprove(profile.role)) return { error: "Keine Berechtigung." };
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("checklist_submissions")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: profile.id })
    .eq("id", submissionId)
    .eq("status", "submitted")
    .select("id")
    .single();

  if (error || !updated) {
    return { error: error?.message ?? "Konnte nicht freigegeben werden — bereits bearbeitet?" };
  }
  await logAudit(supabase, profile.id, "checklist_approved", "checklist_submissions", { submission_id: submissionId });
  revalidatePath(`/checklists/${type}`);
  return { success: true };
}
