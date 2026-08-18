import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/database.types";

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  outlet_id: string | null;
  email: string;
  is_active: boolean;
}

/** Fetches the signed-in user's profile row, or redirects to /login. */
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role, outlet_id, email, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return profile;
});

export function canManageMasterData(role: UserRole) {
  return role === "owner" || role === "manager";
}

export function canApprove(role: UserRole) {
  return role === "owner" || role === "manager";
}

export function canAssignTasks(role: UserRole) {
  return role === "owner" || role === "manager";
}

export function canManageUsers(role: UserRole) {
  return role === "owner" || role === "manager";
}

export function canSeeAuditLog(role: UserRole) {
  return role === "owner" || role === "manager";
}
