"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Send } from "lucide-react";
import { cn, formatTimestamp } from "@/lib/utils";

interface FranzMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function FranzChat({ initialMessages }: { initialMessages: FranzMessage[] }) {
  const [messages, setMessages] = useState<FranzMessage[]>(initialMessages);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    const optimistic: FranzMessage = {
      id: `pending-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/franz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Franz konnte gerade nicht antworten.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: `reply-${Date.now()}`, role: "assistant", content: data.reply, created_at: new Date().toISOString() },
      ]);
    } catch {
      setError("Verbindung zu Franz fehlgeschlagen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Franz oeffnen"
        className="fixed bottom-5 right-24 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-wine shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:bg-wine-soft transition-colors"
      >
        <Bot size={22} className="text-ink" />
      </button>

      {open && (
        <div className="fixed bottom-[86px] right-24 z-50 flex h-[420px] w-80 max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-ink-border bg-ink-raised shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-ink-border px-3.5 py-3">
            <span className="font-serif text-sm text-parchment">Franz</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Franz schliessen" className="text-parchment-dim hover:text-parchment">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5">
            {messages.length === 0 ? (
              <p className="text-sm text-parchment-dim">Frag Franz nach Bestand, Checklisten, Bestellungen oder Terminen.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col gap-0.5", m.role === "user" ? "items-end" : "items-start")}>
                  <span className="text-[0.65rem] text-parchment-dim">
                    {m.role === "user" ? "Du" : "Franz"} · {formatTimestamp(m.created_at)}
                  </span>
                  <span
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs break-words",
                      m.role === "user" ? "bg-wine text-ink" : "bg-ink-card text-parchment",
                    )}
                  >
                    {m.content}
                  </span>
                </div>
              ))
            )}
            {sending && <p className="text-[0.65rem] text-parchment-dim">Franz denkt nach…</p>}
            <div ref={bottomRef} />
          </div>

          {error && <p className="px-3.5 pt-2 text-[0.65rem] text-warn">{error}</p>}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink-border px-3 py-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Frag Franz…"
              className="flex-1 min-w-0 rounded-lg border border-ink-border bg-ink-card px-2.5 py-2 text-xs text-parchment placeholder:text-parchment-dim outline-none focus:border-wine"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Senden"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wine text-ink disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
