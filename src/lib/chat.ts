import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type ChatChannelKind = "outlet" | "management" | "custom";

export interface ChatChannel {
  id: string;
  name: string;
  kind: ChatChannelKind;
  outlet_id: string | null;
  created_by: string | null;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
}

export interface ChatActivity {
  id: string;
  channel_id: string;
  created_at: string;
  user_id: string;
}

/** All channels the caller can see, per RLS — outlet channel(s), the shared
 * Management channel if applicable, and any custom channels they belong to. */
export async function getChatChannels(supabase: SupabaseClient<Database>): Promise<ChatChannel[]> {
  const { data } = await supabase
    .from("chat_channels")
    .select("id, name, kind, outlet_id, created_by")
    .order("created_at", { ascending: true });
  return (data ?? []) as ChatChannel[];
}

/** Newest `limit` messages in one channel, returned oldest-first (ready for display). */
export async function getRecentChatMessages(
  supabase: SupabaseClient<Database>,
  channelId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("chat_messages")
    .select("id, channel_id, content, created_at, user_id, users(name)")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .map((m) => ({
      id: m.id,
      channel_id: m.channel_id,
      content: m.content,
      created_at: m.created_at,
      user_id: m.user_id,
      user_name: (m.users as unknown as { name: string } | null)?.name ?? "—",
    }))
    .reverse();
}

/** Recent activity across several channels at once — enough to seed unread
 * badges without a query per channel. */
export async function getRecentChatActivity(
  supabase: SupabaseClient<Database>,
  channelIds: string[],
  limit = 300,
): Promise<ChatActivity[]> {
  if (channelIds.length === 0) return [];

  const { data } = await supabase
    .from("chat_messages")
    .select("id, channel_id, created_at, user_id")
    .in("channel_id", channelIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
