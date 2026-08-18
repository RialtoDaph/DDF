"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageUsers } from "@/lib/auth";
import type { UserRole } from "@/lib/database.types";

export async function updateUserProfile(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageUsers(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({
      role: formData.get("role") as UserRole,
      outlet_id: String(formData.get("outlet_id") ?? "") || null,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/users");
  return { success: true };
}
