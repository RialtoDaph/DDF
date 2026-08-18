"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import type { QuizQuestionType } from "@/lib/database.types";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function createModule(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const supabase = await createClient();
  const { data: module_, error } = await supabase
    .from("training_modules")
    .insert({
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "") || null,
      menu_item_id: String(formData.get("menu_item_id") ?? "") || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const video = formData.get("video") as File | null;
  if (video && video.size > 0) {
    const path = `${module_.id}/${slugify(video.name || "video")}-${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from("training-videos").upload(path, video, {
      contentType: video.type || "video/mp4",
    });
    if (uploadError) return { error: uploadError.message };

    await supabase.from("training_modules").update({ video_url: path }).eq("id", module_.id);
  }

  revalidatePath("/training");
  redirect(`/training/${module_.id}`);
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
  revalidatePath("/training");
  const score: number = data?.[0]?.score ?? 0;
  const passed: boolean = data?.[0]?.passed ?? false;
  return { error: null, score, passed };
}
