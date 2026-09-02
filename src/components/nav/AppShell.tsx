"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { navForRole, type NavGroup } from "@/lib/nav";
import type { Notification } from "@/lib/notifications";
import type { SearchEntry } from "@/lib/search";
import type { UserRole } from "@/lib/database.types";
import { signOut } from "@/app/auth/actions";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";
import { FloatingChat } from "@/components/chat/FloatingChat";
import { FranzAssistant } from "@/components/franz/FranzAssistant";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Mitarbeiter",
};

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
}

export function AppShell({
  profile,
  notifications,
  searchIndex,
  chatMessages,
  children,
}: {
  profile: { id: string; name: string; role: UserRole; email: string; outlet_id: string | null };
  notifications: Notification[];
  searchIndex: SearchEntry[];
  chatMessages: ChatMessage[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navGroups = navForRole(profile.role);

  // Without this the page behind the mobile drawer scrolls right along with
  // it (especially on iOS Safari) — lock the body while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden min-[900px]:flex min-[900px]:w-60 min-[900px]:flex-col border-r border-ink-border bg-ink-raised">
        <SidebarContent navGroups={navGroups} profile={profile} pathname={pathname} />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="min-[900px]:hidden flex items-center justify-between px-4 h-14 border-b border-ink-border bg-ink-raised">
          <button
            onClick={() => setOpen(true)}
            aria-label="Menue oeffnen"
            className="p-2 -ml-2 text-parchment"
          >
            <Menu size={22} />
          </button>
          <span className="flex items-center gap-2">
            <LogoMark className="h-6 w-auto" />
            <span className="font-serif text-lg text-parchment">Der Dicke Franz</span>
          </span>
          <NotificationBell notifications={notifications} />
        </header>

        {open && (
          <div className="min-[900px]:hidden fixed inset-0 z-50 flex">
            <div className="w-72 bg-ink-raised border-r border-ink-border flex flex-col">
              <div className="flex items-center justify-between px-4 h-14 border-b border-ink-border">
                <span className="flex items-center gap-2">
                  <LogoMark className="h-6 w-auto" />
                  <span className="font-serif text-lg text-parchment">Der Dicke Franz</span>
                </span>
                <button onClick={() => setOpen(false)} aria-label="Menue schliessen" className="p-2 text-parchment">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent
                navGroups={navGroups}
                profile={profile}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
            <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
          </div>
        )}

        <div className="hidden min-[900px]:flex items-center justify-between gap-4 px-8 pt-4">
          <GlobalSearch index={searchIndex} className="w-64" />
          <div className="flex items-center gap-3">
            <NotificationBell notifications={notifications} />
          </div>
        </div>

        <main className="flex-1 min-w-0 p-4 min-[900px]:px-8 min-[900px]:pb-8 min-[900px]:pt-2 max-w-6xl w-full mx-auto">{children}</main>
      </div>

      {profile.outlet_id && (
        <FloatingChat
          outletId={profile.outlet_id}
          currentUserId={profile.id}
          currentUserName={profile.name}
          initialMessages={chatMessages}
        />
      )}
      <FranzAssistant />
    </div>
  );
}

function SidebarContent({
  navGroups,
  profile,
  pathname,
  onNavigate,
}: {
  navGroups: NavGroup[];
  profile: { name: string; role: UserRole; email: string };
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="hidden min-[900px]:flex flex-col items-center px-5 py-5 border-b border-ink-border">
        <Logo className="w-28 h-auto" />
        <p className="text-[0.6rem] tracking-[0.25em] uppercase text-parchment-dim mt-3">Bar-Management</p>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain py-3 px-2 space-y-3">
        {navGroups.map((group, i) => (
          <div key={group.label ?? `group-${i}`} className="space-y-0.5">
            {group.label && (
              <p className="px-3 pt-1 pb-1 text-[0.65rem] tracking-[0.3em] uppercase text-parchment-dim/70">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active =
                item.href === "/checklists/opening"
                  ? pathname.startsWith("/checklists")
                  : item.href === "/handbuch"
                    ? pathname.startsWith("/handbuch") || pathname.startsWith("/training")
                    : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-wine/15 text-wine border border-wine/30"
                      : "text-parchment-dim hover:text-parchment hover:bg-ink-card border border-transparent",
                  )}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
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
