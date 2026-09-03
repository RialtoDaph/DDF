import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRecentChatMessages } from "@/lib/chat";
import { TeamChatPage } from "@/components/chat/TeamChatPage";

export default async function ChatPage() {
  const profile = await requireProfile();
  if (!profile.outlet_id) redirect("/dashboard");

  const supabase = await createClient();
  const messages = await getRecentChatMessages(supabase, profile.outlet_id, 100);

  return (
    <TeamChatPage
      outletId={profile.outlet_id}
      currentUserId={profile.id}
      currentUserName={profile.name}
      initialMessages={messages}
    />
  );
}
