import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const notifications = await getNotifications(supabase, profile);

  return (
    <AppShell profile={profile} notifications={notifications}>
      {children}
    </AppShell>
  );
}
