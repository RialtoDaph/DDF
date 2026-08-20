"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
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

export function FloatingChat({
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
  // Computed once from localStorage at mount (client-only value — the
  // badge legitimately differs from the server-rendered "0", see
  // suppressHydrationWarning below).
  const [unread, setUnread] = useState(() => {
    if (typeof window === "undefined") return 0;
    const lastSeen = localStorage.getItem(lastSeenKey(outletId));
    if (!lastSeen) return 0;
    return initialMessages.filter((m) => m.user_id !== currentUserId && m.created_at > lastSeen).length;
  });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
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
    const { error } = await supabase.from("chat_messages").insert({ outlet_id: outletId, user_id: currentUserId, content });
    setSending(false);
    if (!error) setDraft("");
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Chat oeffnen"
        className="fixed bottom-5 right-5 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-wine-deep shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:bg-wine-soft transition-colors"
      >
        <MessageCircle size={22} className="text-parchment" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-warn px-1 text-[0.65rem] font-semibold text-ink shadow-[0_0_0_2px_var(--color-ink-raised)]">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-[86px] right-5 z-50 flex h-[420px] w-80 max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-ink-border bg-ink-raised shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-ink-border px-3.5 py-3">
            <span className="font-serif text-sm text-parchment">Chat</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Chat schliessen" className="text-parchment-dim hover:text-parchment">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5">
            {messages.length === 0 ? (
              <p className="text-sm text-parchment-dim">Noch keine Nachrichten.</p>
            ) : (
              messages.map((m) => {
                const isOwn = m.user_id === currentUserId;
                return (
                  <div key={m.id} className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
                    <span className="text-[0.65rem] text-parchment-dim">
                      {m.user_name} · {formatTimestamp(m.created_at)}
                    </span>
                    <span
                      className={cn(
                        "max-w-[85%] rounded-xl px-3 py-2 text-xs break-words",
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

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink-border px-3 py-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nachricht…"
              className="flex-1 min-w-0 rounded-lg border border-ink-border bg-ink-card px-2.5 py-2 text-xs text-parchment placeholder:text-parchment-dim outline-none focus:border-wine"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Senden"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wine-deep text-parchment disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
