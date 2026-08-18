"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { SectionAdmin } from "./SectionAdmin";

export interface HandbookSection {
  id: string;
  category: string;
  title: string;
  body: string;
  sort_order: number;
}

export function HandbookBrowser({
  sections,
  canEdit,
}: {
  sections: HandbookSection[];
  canEdit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [sections, q]);

  const byCategory = useMemo(() => {
    const groups = new Map<string, HandbookSection[]>();
    for (const s of matches) {
      const list = groups.get(s.category) ?? [];
      list.push(s);
      groups.set(s.category, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "de"));
  }, [matches]);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-dim" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen — z. B. Zapfanlage, Kasse, Notfall"
          aria-label="Handbuch durchsuchen"
          className="pl-9"
        />
      </div>

      {sections.length === 0 ? (
        <Card>
          <p className="text-sm text-parchment-dim">
            Das Handbuch ist noch leer.
            {canEdit ? " Lege unten den ersten Abschnitt an." : " Ein Manager oder Owner legt die Inhalte an."}
          </p>
        </Card>
      ) : matches.length === 0 ? (
        <Card>
          <p className="text-sm text-parchment-dim">Kein Abschnitt passt zu „{query}“.</p>
        </Card>
      ) : (
        byCategory.map(([category, items]) => (
          <div key={category}>
            <p className="text-xs uppercase tracking-wide text-wine mb-1.5">{category}</p>
            <Card className="p-0 overflow-hidden">
              <ul className="divide-y divide-ink-border">
                {items.map((s, i) => {
                  // While searching, show the hits opened — the point is to read
                  // the answer, not to hunt for it a second time.
                  const open = q ? true : openId === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(open && !q ? null : s.id)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-raised transition-colors"
                      >
                        <span className="text-sm text-parchment">{s.title}</span>
                        <ChevronDown
                          size={16}
                          className={cn(
                            "shrink-0 text-parchment-dim transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </button>
                      {open && (
                        <div className="px-4 pb-4">
                          {s.body.trim() ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-parchment-dim">
                              {s.body}
                            </p>
                          ) : (
                            <p className="text-sm text-parchment-dim italic">Noch kein Inhalt.</p>
                          )}
                          {canEdit && (
                            <SectionAdmin
                              section={s}
                              isFirst={i === 0}
                              isLast={i === items.length - 1}
                            />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
