import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";
import { getSearchIndex } from "@/lib/search";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [notifications, searchIndex, chatMessages] = await Promise.all([
    getNotifications(supabase, profile),
    getSearchIndex(supabase, profile),
    profile.outlet_id
      ? supabase
          .from("chat_messages")
          // Newest 50 first off the wire (LIMIT must keep the *recent* history,
          // not the oldest messages ever sent), then re-sorted ascending for display.
          .select("id, content, created_at, user_id, users(name)")
          .eq("outlet_id", profile.outlet_id)
          .order("created_at", { ascending: false })
          .limit(50)
          .then(({ data }) =>
            (data ?? [])
              .map((m) => ({
                id: m.id,
                content: m.content,
                created_at: m.created_at,
                user_id: m.user_id,
                user_name: (m.users as unknown as { name: string } | null)?.name ?? "—",
              }))
              .reverse(),
          )
      : Promise.resolve([]),
  ]);

  return (
    <AppShell profile={profile} notifications={notifications} searchIndex={searchIndex} chatMessages={chatMessages}>
      {children}
    </AppShell>
  );
}
