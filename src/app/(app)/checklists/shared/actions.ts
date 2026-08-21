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

/** Toggles a non-photo item's checked state. Photo-required items are only ever checked through addChecklistItemPhoto/deleteChecklistItemPhoto below. */
export async function saveItemResult(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const submissionId = String(formData.get("submission_id"));
  const type = formData.get("type") ? String(formData.get("type")) : null;
  const itemText = String(formData.get("item_text"));
  const checked = formData.get("checked") === "true";

  const { data: submission } = await supabase
    .from("checklist_submissions")
    .select("id, status")
    .eq("id", submissionId)
    .single();

  if (!submission) return { error: "Eintrag nicht gefunden." };
  // The UI already disables inputs once readOnly is true, but that's a
  // stale prop from the last render — without this the server would still
  // accept edits to an already-submitted (or approved) report.
  if (submission.status !== "draft") {
    return { error: "Diese Checkliste ist bereits eingereicht und kann nicht mehr bearbeitet werden." };
  }

  const { data: upserted, error } = await supabase
    .from("checklist_item_results")
    .upsert(
      { submission_id: submissionId, item_text: itemText, checked },
      { onConflict: "submission_id,item_text" },
    )
    .select("id")
    .single();

  if (error || !upserted) return { error: error?.message ?? "Speichern fehlgeschlagen." };

  if (type) revalidatePath(`/checklists/${type}`);
  return { success: true };
}

/** Uploads a new photo for a Punkt and marks it checked. A Punkt can carry any number of photos. */
export async function addChecklistItemPhoto(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const submissionId = String(formData.get("submission_id"));
  const type = formData.get("type") ? String(formData.get("type")) : null;
  const itemText = String(formData.get("item_text"));
  const photo = formData.get("photo") as File | null;
  const takenAt = formData.get("taken_at") ? String(formData.get("taken_at")) : new Date().toISOString();

  if (!photo || photo.size === 0) return { error: "Kein Foto übermittelt." };

  const { data: submission } = await supabase
    .from("checklist_submissions")
    .select("id, status, checklist_templates(outlet_id)")
    .eq("id", submissionId)
    .single();

  if (!submission) return { error: "Eintrag nicht gefunden." };
  if (submission.status !== "draft") {
    return { error: "Diese Checkliste ist bereits eingereicht und kann nicht mehr bearbeitet werden." };
  }

  const outletId = (submission.checklist_templates as unknown as { outlet_id: string } | null)?.outlet_id;
  if (!outletId) return { error: "Vorlage nicht gefunden." };

  const photoPath = `${outletId}/${submissionId}/${slugify(itemText)}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("checklist-photos")
    .upload(photoPath, photo, { contentType: "image/jpeg" });

  if (uploadError) return { error: uploadError.message };

  const { data: itemResult, error: upsertError } = await supabase
    .from("checklist_item_results")
    .upsert(
      { submission_id: submissionId, item_text: itemText, checked: true },
      { onConflict: "submission_id,item_text" },
    )
    .select("id")
    .single();

  if (upsertError || !itemResult) return { error: upsertError?.message ?? "Speichern fehlgeschlagen." };

  const { data: photoRow, error: photoError } = await supabase
    .from("checklist_item_photos")
    .insert({ item_result_id: itemResult.id, photo_url: photoPath, taken_at: takenAt })
    .select("id")
    .single();

  if (photoError || !photoRow) return { error: photoError?.message ?? "Foto konnte nicht gespeichert werden." };

  if (type) revalidatePath(`/checklists/${type}`);
  return { success: true, photoId: photoRow.id };
}

/** Deletes one photo. If it was the item's last photo, the item drops back to unchecked. */
export async function deleteChecklistItemPhoto(photoId: string, submissionId: string, type: ChecklistType) {
  await requireProfile();
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("checklist_submissions")
    .select("id, status")
    .eq("id", submissionId)
    .single();

  if (!submission) return { error: "Eintrag nicht gefunden." };
  if (submission.status !== "draft") {
    return { error: "Diese Checkliste ist bereits eingereicht und kann nicht mehr bearbeitet werden." };
  }

  const { data: photo } = await supabase
    .from("checklist_item_photos")
    .select("photo_url, item_result_id")
    .eq("id", photoId)
    .single();
  if (!photo) return { error: "Foto nicht gefunden." };

  const { error } = await supabase.from("checklist_item_photos").delete().eq("id", photoId);
  if (error) return { error: error.message };

  await supabase.storage.from("checklist-photos").remove([photo.photo_url]);

  const { count } = await supabase
    .from("checklist_item_photos")
    .select("id", { count: "exact", head: true })
    .eq("item_result_id", photo.item_result_id);

  if (!count) {
    await supabase.from("checklist_item_results").update({ checked: false }).eq("id", photo.item_result_id);
  }

  revalidatePath(`/checklists/${type}`);
  return { success: true };
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
  const profile = await requireProfile();
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

  await logAudit(supabase, profile.id, "checklist_submitted", "checklist_submissions", { submission_id: submissionId });

  revalidatePath(`/checklists/${type}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function approveChecklist(submissionId: string, type: ChecklistType) {
  const profile = await requireProfile();
  if (!canApprove(profile.role)) return { error: "Keine Berechtigung." };
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("checklist_submissions")
    .select("user_id")
    .eq("id", submissionId)
    .single();
  if (submission?.user_id === profile.id) {
    return { error: "Du kannst deine eigene Checkliste nicht selbst freigeben." };
  }

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
