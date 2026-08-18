import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export async function logAudit(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: string,
  relatedTable?: string,
  changeDetail?: unknown,
) {
  await supabase.from("audit_log").insert({
    user_id: userId,
    action,
    related_table: relatedTable ?? null,
    change_detail: changeDetail ?? null,
  });
}
