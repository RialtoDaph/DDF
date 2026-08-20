"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { SearchEntry } from "@/lib/search";

export function GlobalSearch({ index, className }: { index: SearchEntry[]; className?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index.filter((e) => e.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query, index]);

  function go(href: string) {
    setQuery("");
    setOpen(false);
    router.push(href);
  }

  return (
    <div ref={containerRef} className={className} style={{ position: "relative" }}>
      <div className="flex items-center gap-2 rounded-lg border border-ink-border bg-ink-card px-3 py-2">
        <Search size={14} className="text-parchment-dim shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Suchen…"
          className="flex-1 min-w-0 bg-transparent text-sm text-parchment placeholder:text-parchment-dim/70 outline-none"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-full min-w-64 rounded-xl border border-ink-border bg-ink-card p-1.5 shadow-2xl">
          {results.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-parchment-dim">Keine Treffer.</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r.href)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-ink-raised"
              >
                <span className="text-sm text-parchment truncate">{r.label}</span>
                <span className="shrink-0 text-[0.65rem] uppercase tracking-wide text-parchment-dim">{r.type}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
