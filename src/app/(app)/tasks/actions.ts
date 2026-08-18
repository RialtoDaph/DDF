"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canAssignTasks } from "@/lib/auth";
import type { RecurrenceType, TaskStatus } from "@/lib/database.types";

export async function createTask(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canAssignTasks(profile.role)) {
    return { error: "Keine Berechtigung." };
  }
  if (!profile.outlet_id) {
    return { error: "Kein Standort zugeordnet." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "") || null,
    assigned_to: String(formData.get("assigned_to") ?? "") || null,
    due_date: formData.get("due_date") ? String(formData.get("due_date")) : null,
    recurrence: (formData.get("recurrence") as RecurrenceType) ?? "none",
    outlet_id: profile.outlet_id,
    created_by: profile.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, assigned_to, recurrence, due_date, outlet_id, created_by")
    .eq("id", taskId)
    .single();

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message);

  if (status === "done" && task && task.recurrence !== "none") {
    const base = task.due_date ? new Date(task.due_date) : new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + (task.recurrence === "daily" ? 1 : 7));

    const { error: recurError } = await supabase.from("tasks").insert({
      title: task.title,
      description: task.description,
      assigned_to: task.assigned_to,
      due_date: next.toISOString().slice(0, 10),
      recurrence: task.recurrence,
      outlet_id: task.outlet_id,
      created_by: task.created_by,
    });
    if (recurError) {
      // Non-owner/manager assignees can be blocked from creating the next
      // occurrence by the tasks_insert RLS policy. Don't fail the status
      // update over it (the primary action still succeeded) — but don't
      // swallow it silently either, so the missed occurrence is traceable.
      console.error(`setTaskStatus: failed to create recurring follow-up for task ${taskId}:`, recurError.message);
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
