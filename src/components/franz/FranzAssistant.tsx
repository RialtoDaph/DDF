"use client";

import { useRef, useState } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface FranzMessage {
  role: "user" | "assistant";
  content: string;
}

export function FranzAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<FranzMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;

    const nextMessages: FranzMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/franz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Franz hat gerade ein Problem.");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch {
      setError("Franz ist gerade nicht erreichbar. Bitte Verbindung prüfen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Franz oeffnen"
        className="fixed bottom-5 left-5 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-wine-deep shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:bg-wine-soft transition-colors"
      >
        <Sparkles size={22} className="text-parchment" />
      </button>

      {open && (
        <div className="fixed bottom-[86px] left-5 z-50 flex h-[440px] w-80 max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-ink-border bg-ink-raised shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-ink-border px-3.5 py-3">
            <div>
              <span className="font-serif text-sm text-parchment">Franz</span>
              <p className="text-[0.6rem] text-parchment-dim">Fragt Inventar, Rezepte, Checklisten & Handbuch ab</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Franz schliessen" className="text-parchment-dim hover:text-parchment">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5">
            {messages.length === 0 ? (
              <p className="text-sm text-parchment-dim">
                Frag mich z. B. „Wieviel Gin Basil Smash kosten wir?“, „Was ist noch offen bei der Wochencheck?“ oder „Wie reinige ich die Zapfanlage?“.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn("flex flex-col gap-0.5", m.role === "user" ? "items-end" : "items-start")}>
                  <span
                    className={cn(
                      "max-w-[90%] rounded-xl px-3 py-2 text-xs whitespace-pre-wrap break-words",
                      m.role === "user" ? "bg-wine text-ink" : "bg-ink-card text-parchment",
                    )}
                  >
                    {m.content}
                  </span>
                </div>
              ))
            )}
            {pending && <p className="text-xs text-parchment-dim">Franz überlegt…</p>}
            <div ref={bottomRef} />
          </div>

          {error && <p className="px-3.5 pt-2 text-[0.65rem] text-warn">{error}</p>}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink-border px-3 py-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Frag Franz…"
              disabled={pending}
              className="flex-1 min-w-0 rounded-lg border border-ink-border bg-ink-card px-2.5 py-2 text-xs text-parchment placeholder:text-parchment-dim outline-none focus:border-wine disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
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
