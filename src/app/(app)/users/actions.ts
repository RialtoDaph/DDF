"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageUsers } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/lib/database.types";

export async function updateUserProfile(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageUsers(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const id = String(formData.get("id") ?? "");
  const role = formData.get("role") as UserRole;
  const outlet_id = String(formData.get("outlet_id") ?? "") || null;
  const is_active = formData.get("is_active") === "on";

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ role, outlet_id, is_active }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await logAudit(supabase, profile.id, "user_updated", "users", { user_id: id, role, outlet_id, is_active });

  revalidatePath("/users");
  return { success: true };
}
