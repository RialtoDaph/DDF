"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveHandoverNote } from "../checklists/shared/actions";
import { Textarea } from "@/components/ui/Field";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function HandoverWidget({
  latest,
}: {
  latest: { content: string; user_name: string } | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, fd) => {
    return saveHandoverNote(fd);
  }, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <div className="rounded-xl border border-ink-border border-l-2 border-l-wine bg-ink-card p-3.5">
      <p className="text-[10px] uppercase tracking-[0.08em] text-wine mb-2">Schichtübergabe</p>
      {latest && (
        <p className="text-xs text-parchment-dim mb-2 leading-relaxed">
          Letzte Übergabe ({latest.user_name}): {latest.content}
        </p>
      )}
      <form ref={formRef} action={formAction} className="space-y-1.5">
        <Textarea name="content" rows={3} placeholder="Notiz für die nächste Schicht…" required className="text-xs" />
        {state?.error && <p className="text-xs text-warn">{state.error}</p>}
        {state?.success && <p className="text-xs text-done">Gespeichert.</p>}
        <button type="submit" disabled={pending} className="text-xs text-wine hover:underline disabled:opacity-50">
          {pending ? "Speichert…" : "Speichern"}
        </button>
      </form>
    </div>
  );
}
