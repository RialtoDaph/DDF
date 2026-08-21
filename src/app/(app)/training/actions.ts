"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { isValidVideoLink } from "./shared/driveVideo";
import type { QuizQuestionType } from "@/lib/database.types";

// Inserts the module row only — the video (if any) is uploaded directly from
// the browser straight to Supabase Storage (see NewModuleForm), because
// routing a multi-MB video file through this server action would hit
// Next.js's/Vercel's request body size limit and fail silently.
export async function createModuleRecord(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error?: string; id?: string }> {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Titel ist erforderlich." };

  const supabase = await createClient();
  const { data: module_, error } = await supabase
    .from("training_modules")
    .insert({
      title,
      description: String(formData.get("description") ?? "") || null,
      menu_item_id: String(formData.get("menu_item_id") ?? "") || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/handbuch");
  return { id: module_.id };
}

export async function updateModuleRecord(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Titel ist erforderlich." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_modules")
    .update({
      title,
      description: String(formData.get("description") ?? "") || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/training/${id}`);
  revalidatePath("/handbuch");
  return { success: true };
}

export async function attachModuleVideo(moduleId: string, url: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return { error: "Keine Berechtigung." };
  if (!isValidVideoLink(url)) return { error: "Bitte einen gültigen Video-Link angeben." };

  const supabase = await createClient();
  const { error } = await supabase.from("training_modules").update({ video_url: url }).eq("id", moduleId);
  if (error) return { error: error.message };

  revalidatePath(`/training/${moduleId}`);
  return {};
}

export async function addQuizQuestion(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const moduleId = String(formData.get("training_module_id") ?? "");
  const type = formData.get("type") as QuizQuestionType;
  const optionsRaw = String(formData.get("options") ?? "");
  const options =
    type === "multiple_choice"
      ? optionsRaw
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
      : null;

  const supabase = await createClient();
  const { error } = await supabase.from("quiz_questions").insert({
    training_module_id: moduleId,
    question: String(formData.get("question") ?? "").trim(),
    type,
    options,
    correct_answer: String(formData.get("correct_answer") ?? "").trim(),
  });

  if (error) return { error: error.message };

  revalidatePath(`/training/${moduleId}`);
  return { success: true };
}

export async function removeQuizQuestion(questionId: string, moduleId: string) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) return;

  const supabase = await createClient();
  await supabase.from("quiz_questions").delete().eq("id", questionId);
  revalidatePath(`/training/${moduleId}`);
}

export async function submitQuiz(
  moduleId: string,
  answers: Record<string, string>,
): Promise<{ error: string | null; score: number; passed: boolean }> {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("submit_quiz_attempt", {
    p_module_id: moduleId,
    p_answers: answers,
  });

  if (error) return { error: error.message, score: 0, passed: false };

  revalidatePath(`/training/${moduleId}`);
  revalidatePath("/handbuch");
  const score: number = data?.[0]?.score ?? 0;
  const passed: boolean = data?.[0]?.passed ?? false;
  return { error: null, score, passed };
}
