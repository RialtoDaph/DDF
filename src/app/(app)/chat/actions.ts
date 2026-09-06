"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function createChatChannel(name: string, memberUserIds: string[]) {
  const profile = await requireProfile();
  if (profile.role !== "owner" && profile.role !== "manager") {
    return { error: "Keine Berechtigung." };
  }

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name fehlt." };

  const supabase = await createClient();
  const { data: channel, error } = await supabase
    .from("chat_channels")
    .insert({ name: trimmed, kind: "custom", created_by: profile.id })
    .select("id")
    .single();

  if (error || !channel) return { error: error?.message ?? "Kanal konnte nicht erstellt werden." };

  const memberIds = Array.from(new Set([profile.id, ...memberUserIds]));
  const { error: memberError } = await supabase
    .from("chat_channel_members")
    .insert(memberIds.map((userId) => ({ channel_id: channel.id, user_id: userId })));

  if (memberError) return { error: memberError.message };

  await logAudit(supabase, profile.id, "chat_channel_create", "chat_channels", {
    channel_id: channel.id,
    name: trimmed,
    member_count: memberIds.length,
  });

  revalidatePath("/chat");
  return { channelId: channel.id as string };
}

export async function deleteChatChannel(channelId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_channels")
    .delete()
    .eq("id", channelId)
    .eq("kind", "custom")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  // RLS can silently match zero rows (not the creator, no longer a member,
  // not an owner) instead of failing loudly — without this check the UI
  // would claim the channel was deleted while it's still there.
  if (!data) return { error: "Nicht gefunden oder keine Berechtigung." };

  await logAudit(supabase, profile.id, "chat_channel_delete", "chat_channels", { channel_id: channelId });

  revalidatePath("/chat");
  return { success: true };
}

export async function leaveChatChannel(channelId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_channel_members")
    .delete()
    .eq("channel_id", channelId)
    .eq("user_id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/chat");
  return { success: true };
}
