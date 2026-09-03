"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ChatChannel, ChatActivity } from "@/lib/chat";

const lastSeenKey = (channelId: string) => `ddf-chat-lastseen-${channelId}`;

function countUnread(channels: ChatChannel[], activity: ChatActivity[], currentUserId: string) {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (const channel of channels) {
    const lastSeen = localStorage.getItem(lastSeenKey(channel.id));
    if (!lastSeen) continue;
    total += activity.filter(
      (m) => m.channel_id === channel.id && m.user_id !== currentUserId && m.created_at > lastSeen,
    ).length;
  }
  return total;
}

export function TeamChatNavLink({
  channels,
  recentActivity,
  currentUserId,
  active,
  onNavigate,
}: {
  channels: ChatChannel[];
  recentActivity: ChatActivity[];
  currentUserId: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  const [unread, setUnread] = useState(() => countUnread(channels, recentActivity, currentUserId));
  const [supabase] = useState(() => createClient());
  const channelsRef = useRef(channels);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

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
      .channel(`chat-badge:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as { channel_id: string; user_id: string };
          if (row.user_id !== currentUserId && channelsRef.current.some((c) => c.id === row.channel_id)) {
            setUnread((u) => u + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // Marking "seen" in localStorage is a write to an external system, so it
  // belongs in an effect (unlike the badge reset above, which is React
  // state and handled during render instead).
  useEffect(() => {
    if (!active) return;
    const now = new Date().toISOString();
    channels.forEach((c) => localStorage.setItem(lastSeenKey(c.id), now));
  }, [active, channels]);

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
