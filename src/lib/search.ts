import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Profile } from "@/lib/auth";
import { canManageUsers } from "@/lib/auth";

export interface SearchEntry {
  id: string;
  label: string;
  type: string;
  href: string;
}

/** Flat index for the topbar's live search — small enough per outlet to filter client-side as the user types. */
export async function getSearchIndex(
  supabase: SupabaseClient<Database>,
  profile: Profile,
): Promise<SearchEntry[]> {
  const [{ data: items }, { data: tasks }, { data: sections }, { data: users }] = await Promise.all([
    supabase.from("inventory_items").select("id, name"),
    supabase.from("tasks").select("id, title").neq("status", "done"),
    profile.outlet_id
      ? supabase.from("handbook_sections").select("id, title").eq("outlet_id", profile.outlet_id)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    canManageUsers(profile.role) ? supabase.from("users").select("id, name") : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const entries: SearchEntry[] = [];

  for (const i of items ?? []) {
    entries.push({ id: `item-${i.id}`, label: i.name, type: "Inventar", href: `/inventory/${i.id}` });
  }
  for (const t of tasks ?? []) {
    entries.push({ id: `task-${t.id}`, label: t.title, type: "Aufgabe", href: `/tasks` });
  }
  for (const s of sections ?? []) {
    entries.push({ id: `section-${s.id}`, label: s.title, type: "Handbuch", href: `/handbuch` });
  }
  for (const u of users ?? []) {
    entries.push({ id: `user-${u.id}`, label: u.name, type: "Benutzer", href: `/users` });
  }

  return entries;
}
