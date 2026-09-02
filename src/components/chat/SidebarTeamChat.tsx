"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, ChevronDown, ChevronUp, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatTimestamp } from "@/lib/utils";

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
}

const lastSeenKey = (outletId: string) => `ddf-chat-lastseen-${outletId}`;

export function SidebarTeamChat({
  outletId,
  currentUserId,
  currentUserName,
  initialMessages,
}: {
  outletId: string;
  currentUserId: string;
  currentUserName: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [open, setOpen] = useState(false);
  // Computed once from localStorage at mount (client-only value — the badge
  // legitimately differs from the server-rendered "0", see the effect below).
  const [unread, setUnread] = useState(() => {
    if (typeof window === "undefined") return 0;
    const lastSeen = localStorage.getItem(lastSeenKey(outletId));
    if (!lastSeen) return 0;
    return initialMessages.filter((m) => m.user_id !== currentUserId && m.created_at > lastSeen).length;
  });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${outletId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `outlet_id=eq.${outletId}` },
        async (payload) => {
          const row = payload.new as { id: string; content: string; created_at: string; user_id: string };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const name = row.user_id === currentUserId ? currentUserName : prev.find((m) => m.user_id === row.user_id)?.user_name;
            return [...prev, { ...row, user_name: name ?? "…" }];
          });

          if (row.user_id !== currentUserId) {
            setUnread((u) => u + 1);
            const { data } = await supabase.from("users").select("name").eq("id", row.user_id).single();
            if (data) {
              setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, user_name: data.name } : m)));
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next) {
        setUnread(0);
        localStorage.setItem(lastSeenKey(outletId), new Date().toISOString());
      }
      return next;
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setSendError(null);
    const { error } = await supabase.from("chat_messages").insert({ outlet_id: outletId, user_id: currentUserId, content });
    setSending(false);
    if (error) {
      setSendError("Nachricht konnte nicht gesendet werden.");
    } else {
      setDraft("");
    }
  }

  return (
    <div className="border-t border-ink-border">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-parchment-dim hover:text-parchment transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageCircle size={16} />
          Team-Chat
          {!open && unread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[0.6rem] font-semibold text-ink">
              {unread}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="flex flex-col border-t border-ink-border">
          <div className="max-h-56 overflow-y-auto px-3 py-2.5 space-y-2">
            {messages.length === 0 ? (
              <p className="text-xs text-parchment-dim">Noch keine Nachrichten.</p>
            ) : (
              messages.map((m) => {
                const isOwn = m.user_id === currentUserId;
                return (
                  <div key={m.id} className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
                    <span className="text-[0.6rem] text-parchment-dim">
                      {m.user_name} · {formatTimestamp(m.created_at)}
                    </span>
                    <span
                      className={cn(
                        "max-w-[90%] rounded-xl px-2.5 py-1.5 text-xs break-words",
                        isOwn ? "bg-wine text-ink" : "bg-ink-card text-parchment",
                      )}
                    >
                      {m.content}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {sendError && <p className="px-3 pt-1 text-[0.6rem] text-warn">{sendError}</p>}
          <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nachricht…"
              className="flex-1 min-w-0 rounded-lg border border-ink-border bg-ink-card px-2.5 py-1.5 text-xs text-parchment placeholder:text-parchment-dim outline-none focus:border-wine"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Senden"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-wine-deep text-parchment disabled:opacity-40"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
