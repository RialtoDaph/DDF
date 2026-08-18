import { requireProfile } from "@/lib/auth";
import { navForRole } from "@/lib/nav";
import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const navItems = navForRole(profile.role);
  const supabase = await createClient();
  const notifications = await getNotifications(supabase, profile);

  return (
    <AppShell navItems={navItems} profile={profile} notifications={notifications}>
      {children}
    </AppShell>
  );
}
