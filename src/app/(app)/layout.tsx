import { requireProfile } from "@/lib/auth";
import { navForRole } from "@/lib/nav";
import { AppShell } from "@/components/nav/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const navItems = navForRole(profile.role);

  return (
    <AppShell navItems={navItems} profile={profile}>
      {children}
    </AppShell>
  );
}
