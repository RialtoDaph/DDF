"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatTimestamp } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat";

const lastSeenKey = (outletId: string) => `ddf-chat-lastseen-${outletId}`;

export function TeamChatPage({
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
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(() => createClient());

  // Viewing this page is what "reads" the chat — the sidebar badge compares
  // message timestamps against this value.
  useEffect(() => {
    localStorage.setItem(lastSeenKey(outletId), new Date().toISOString());
  }, [outletId]);

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
          localStorage.setItem(lastSeenKey(outletId), new Date().toISOString());

          if (row.user_id !== currentUserId) {
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
    <div className="flex flex-col h-[75vh] max-w-2xl mx-auto rounded-2xl border border-ink-border bg-ink-raised overflow-hidden">
      <div className="border-b border-ink-border px-5 py-4">
        <h1 className="font-serif text-xl text-parchment">Team-Chat</h1>
        <p className="text-xs text-parchment-dim mt-0.5">Ein gemeinsamer Kanal für euren Standort.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-parchment-dim">Noch keine Nachrichten. Schreib die erste!</p>
        ) : (
          messages.map((m) => {
            const isOwn = m.user_id === currentUserId;
            return (
              <div key={m.id} className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
                <span className="text-xs text-parchment-dim">
                  {m.user_name} · {formatTimestamp(m.created_at)}
                </span>
                <span
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
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

      {sendError && <p className="px-5 pt-2 text-xs text-warn">{sendError}</p>}
      <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-ink-border px-4 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nachricht an das Team…"
          className="flex-1 min-w-0 rounded-lg border border-ink-border bg-ink-card px-3.5 py-2.5 text-sm text-parchment placeholder:text-parchment-dim outline-none focus:border-wine"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Senden"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-wine-deep text-parchment disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
