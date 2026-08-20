"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Pencil, X } from "lucide-react";
import { updateSection, removeSection, moveSection } from "./actions";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";
import type { HandbookSection } from "./HandbookBrowser";

export function SectionAdmin({
  section,
  isFirst,
  isLast,
}: {
  section: HandbookSection;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);
  const [state, formAction, savePending] = useActionState<ActionState, FormData>(
    updateSection,
    initialActionState,
  );

  function move(direction: "up" | "down") {
    setRowError(null);
    startTransition(async () => {
      const res = await moveSection(section.id, direction);
      if (res?.error) setRowError(res.error);
    });
  }

  function remove() {
    setRowError(null);
    startTransition(async () => {
      const res = await removeSection(section.id);
      if (res?.error) setRowError(res.error);
    });
  }

  if (editing) {
    return (
      <form action={formAction} className="mt-4 space-y-3 border-t border-ink-border pt-4">
        <input type="hidden" name="id" value={section.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`title-${section.id}`}>Titel</Label>
            <Input id={`title-${section.id}`} name="title" defaultValue={section.title} required />
          </div>
          <div>
            <Label htmlFor={`category-${section.id}`}>Kategorie</Label>
            <Input id={`category-${section.id}`} name="category" defaultValue={section.category} />
          </div>
        </div>
        <div>
          <Label htmlFor={`body-${section.id}`}>Inhalt</Label>
          <Textarea id={`body-${section.id}`} name="body" defaultValue={section.body} rows={8} />
        </div>
        {state?.error && <p className="text-sm text-warn">{state.error}</p>}
        {state?.success && <p className="text-sm text-done">Gespeichert.</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" disabled={savePending}>
            {savePending ? "Wird gespeichert…" : "Speichern"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            {state?.success ? "Fertig" : "Abbrechen"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-3 border-t border-ink-border pt-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => move("up")}
          disabled={isFirst || pending}
          aria-label="Nach oben verschieben"
          className="text-parchment-dim hover:text-wine disabled:opacity-30"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => move("down")}
          disabled={isLast || pending}
          aria-label="Nach unten verschieben"
          className="text-parchment-dim hover:text-wine disabled:opacity-30"
        >
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Abschnitt bearbeiten"
          className="text-parchment-dim hover:text-wine ml-1"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label="Abschnitt loeschen"
          className="text-parchment-dim hover:text-warn ml-1"
        >
          <X size={14} />
        </button>
      </div>
      {rowError && <p className="text-xs text-warn mt-1">{rowError}</p>}
    </div>
  );
}
