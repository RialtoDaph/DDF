import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
}

/** Newest `limit` messages, returned oldest-first (ready for display). */
export async function getRecentChatMessages(
  supabase: SupabaseClient<Database>,
  outletId: string | null,
  limit: number,
): Promise<ChatMessage[]> {
  if (!outletId) return [];

  const { data } = await supabase
    .from("chat_messages")
    .select("id, content, created_at, user_id, users(name)")
    .eq("outlet_id", outletId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .map((m) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      user_id: m.user_id,
      user_name: (m.users as unknown as { name: string } | null)?.name ?? "—",
    }))
    .reverse();
}
