import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getChatChannels, getRecentChatMessages } from "@/lib/chat";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";

export default async function ChatPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const channels = await getChatChannels(supabase);
  if (channels.length === 0) redirect("/dashboard");

  const defaultChannel =
    channels.find((c) => c.kind === "outlet" && c.outlet_id === profile.outlet_id) ?? channels[0];

  const canCreateChannels = profile.role === "owner" || profile.role === "manager";

  const [messages, eligibleUsersRes] = await Promise.all([
    getRecentChatMessages(supabase, defaultChannel.id, 100),
    canCreateChannels
      ? supabase.from("users").select("id, name").eq("is_active", true).neq("id", profile.id).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  return (
    <ChatWorkspace
      channels={channels}
      initialChannelId={defaultChannel.id}
      initialMessages={messages}
      currentUserId={profile.id}
      currentUserName={profile.name}
      canCreateChannels={canCreateChannels}
      eligibleUsers={eligibleUsersRes.data ?? []}
    />
  );
}
