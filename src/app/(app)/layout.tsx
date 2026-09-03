import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";
import { getSearchIndex } from "@/lib/search";
import { getRecentChatMessages } from "@/lib/chat";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Only used to seed the sidebar's unread badge — the full history loads
  // separately on /chat.
  const [notifications, searchIndex, chatMessages] = await Promise.all([
    getNotifications(supabase, profile),
    getSearchIndex(supabase, profile),
    getRecentChatMessages(supabase, profile.outlet_id, 50),
  ]);

  return (
    <AppShell profile={profile} notifications={notifications} searchIndex={searchIndex} chatMessages={chatMessages}>
      {children}
    </AppShell>
  );
}
