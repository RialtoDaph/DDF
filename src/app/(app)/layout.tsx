import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";
import { getSearchIndex } from "@/lib/search";
import { getChatChannels, getRecentChatActivity } from "@/lib/chat";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [notifications, searchIndex, chatChannels] = await Promise.all([
    getNotifications(supabase, profile),
    getSearchIndex(supabase, profile),
    getChatChannels(supabase),
  ]);

  // Only used to seed the sidebar's unread badge — the full history loads
  // separately on /chat.
  const chatActivity = await getRecentChatActivity(supabase, chatChannels.map((c) => c.id));

  return (
    <AppShell profile={profile} notifications={notifications} searchIndex={searchIndex} chatChannels={chatChannels} chatActivity={chatActivity}>
      {children}
    </AppShell>
  );
}
