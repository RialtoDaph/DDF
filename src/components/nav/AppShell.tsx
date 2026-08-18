"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { navForRole, type NavItem } from "@/lib/nav";
import type { Notification } from "@/lib/notifications";
import type { UserRole } from "@/lib/database.types";
import { signOut } from "@/app/auth/actions";
import { NotificationBell } from "./NotificationBell";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Mitarbeiter",
};

export function AppShell({
  profile,
  notifications,
  children,
}: {
  profile: { name: string; role: UserRole; email: string };
  notifications: Notification[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navItems = navForRole(profile.role);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-ink-border bg-ink-raised">
        <SidebarContent navItems={navItems} profile={profile} pathname={pathname} />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-ink-border bg-ink-raised">
          <button
            onClick={() => setOpen(true)}
            aria-label="Menue oeffnen"
            className="p-2 -ml-2 text-parchment"
          >
            <Menu size={22} />
          </button>
          <span className="font-serif text-lg text-brass">The Logbook</span>
          <NotificationBell notifications={notifications} />
        </header>

        {open && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="w-72 bg-ink-raised border-r border-ink-border flex flex-col">
              <div className="flex items-center justify-between px-4 h-14 border-b border-ink-border">
                <span className="font-serif text-lg text-brass">The Logbook</span>
                <button onClick={() => setOpen(false)} aria-label="Menue schliessen" className="p-2 text-parchment">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent
                navItems={navItems}
                profile={profile}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
            <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
          </div>
        )}

        <div className="hidden md:flex items-center justify-end px-8 pt-4">
          <NotificationBell notifications={notifications} />
        </div>

        <main className="flex-1 min-w-0 p-4 md:px-8 md:pb-8 md:pt-2 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  navItems,
  profile,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  profile: { name: string; role: UserRole; email: string };
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="hidden md:block px-5 py-5 border-b border-ink-border">
        <p className="text-[0.65rem] tracking-[0.3em] uppercase text-brass mb-1">The Logbook</p>
        <p className="font-serif text-xl text-parchment leading-tight">Bar-Management</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-brass/15 text-brass border border-brass/30"
                  : "text-parchment-dim hover:text-parchment hover:bg-ink-card border border-transparent",
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-border px-3 py-3">
        <div className="px-2 mb-2">
          <p className="text-sm text-parchment truncate">{profile.name}</p>
          <p className="text-xs text-parchment-dim tabular uppercase tracking-wide">
            {ROLE_LABEL[profile.role] ?? profile.role}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-parchment-dim hover:text-warn hover:bg-warn-soft transition-colors"
          >
            <LogOut size={16} />
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
