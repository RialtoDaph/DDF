"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface UnreadSourceMessage {
  id: string;
  created_at: string;
  user_id: string;
}

const lastSeenKey = (outletId: string) => `ddf-chat-lastseen-${outletId}`;

export function TeamChatNavLink({
  outletId,
  currentUserId,
  initialMessages,
  active,
  onNavigate,
}: {
  outletId: string;
  currentUserId: string;
  initialMessages: UnreadSourceMessage[];
  active: boolean;
  onNavigate?: () => void;
}) {
  const [unread, setUnread] = useState(() => {
    if (typeof window === "undefined") return 0;
    const lastSeen = localStorage.getItem(lastSeenKey(outletId));
    if (!lastSeen) return 0;
    return initialMessages.filter((m) => m.user_id !== currentUserId && m.created_at > lastSeen).length;
  });
  const [supabase] = useState(() => createClient());

  // The sidebar persists across navigation, so this link's own state doesn't
  // remount when /chat becomes the active route — reset the badge the
  // moment that happens by adjusting state during render (React's
  // documented pattern for this) rather than in an effect, which would
  // cause an extra render.
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setUnread(0);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`chat-badge:${outletId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `outlet_id=eq.${outletId}` },
        (payload) => {
          const row = payload.new as { user_id: string };
          if (row.user_id !== currentUserId) setUnread((u) => u + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);

  // Marking "seen" in localStorage is a write to an external system, so it
  // belongs in an effect (unlike the badge reset above, which is React
  // state and handled during render instead).
  useEffect(() => {
    if (active) localStorage.setItem(lastSeenKey(outletId), new Date().toISOString());
  }, [active, outletId]);

  return (
    <Link
      href="/chat"
      onClick={onNavigate}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-wine/15 text-wine border border-wine/30"
          : "text-parchment-dim hover:text-parchment hover:bg-ink-card border border-transparent",
      )}
    >
      <span className="flex items-center gap-3">
        <MessageCircle size={18} strokeWidth={1.75} />
        Team-Chat
      </span>
      {unread > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[0.6rem] font-semibold text-ink">
          {unread}
        </span>
      )}
    </Link>
  );
}
