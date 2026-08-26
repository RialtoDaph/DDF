"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/notifications";

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const warnCount = notifications.filter((n) => n.severity === "warn").length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Benachrichtigungen"
        className="relative p-2 text-parchment-dim hover:text-parchment"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full text-[0.6rem] flex items-center justify-center px-1",
              warnCount > 0 ? "bg-warn text-parchment" : "bg-wine text-ink",
            )}
          >
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-ink-border bg-ink-card p-1.5 shadow-2xl">
            {notifications.length === 0 ? (
              <p className="text-sm text-parchment-dim px-2.5 py-2">Keine Benachrichtigungen.</p>
            ) : (
              <ul className="divide-y divide-ink-border">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-ink-raised"
                    >
                      <span className={cn("mt-1 h-1.5 w-1.5 rounded-full shrink-0", n.severity === "warn" ? "bg-warn" : "bg-wine")} />
                      <span className="text-parchment-dim">{n.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
