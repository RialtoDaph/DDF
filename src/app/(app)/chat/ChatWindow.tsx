"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { formatTimestamp } from "@/lib/utils";

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
}

export function ChatWindow({
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
  const [error, setError] = useState<string | null>(null);
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

          // The realtime payload doesn't include the joined name for senders
          // we haven't seen yet in this session — fetch it once and patch in.
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
    setError(null);
    const { error } = await supabase.from("chat_messages").insert({
      outlet_id: outletId,
      user_id: currentUserId,
      content,
    });
    setSending(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDraft("");
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 paper-card">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-parchment-dim">Noch keine Nachrichten. Schreib die erste.</p>
        ) : (
          messages.map((m) => {
            const isOwn = m.user_id === currentUserId;
            return (
              <div key={m.id} className={isOwn ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    isOwn
                      ? "max-w-[75%] rounded-md bg-wine/20 border border-wine/40 px-3 py-2"
                      : "max-w-[75%] rounded-md bg-ink-raised border border-ink-border px-3 py-2"
                  }
                >
                  {!isOwn && <p className="text-xs text-wine-soft mb-0.5">{m.user_name}</p>}
                  <p className="text-sm text-parchment whitespace-pre-wrap break-words">{m.content}</p>
                  <p className="tabular text-[0.65rem] text-parchment-dim mt-1">{formatTimestamp(m.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-ink-border p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          rows={1}
          placeholder="Nachricht schreiben…"
          className="flex-1 resize-none rounded-md border border-ink-border bg-ink-raised px-3 py-2 text-sm text-parchment placeholder:text-parchment-dim/60 outline-none focus:border-wine focus:ring-1 focus:ring-wine"
        />
        <Button type="submit" disabled={sending || !draft.trim()}>
          Senden
        </Button>
      </form>
      {error && <p className="text-xs text-warn px-3 pb-2">{error}</p>}
    </div>
  );
}
