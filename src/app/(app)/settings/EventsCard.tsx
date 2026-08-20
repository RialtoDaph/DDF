"use client";

import { useActionState, useRef, useTransition } from "react";
import { X } from "lucide-react";
import { createEvent, deleteEvent } from "./actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function EventsCard({ events }: { events: { id: string; label: string; event_date: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [removePending, startRemove] = useTransition();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await createEvent(prev, fd);
    if (result?.success) formRef.current?.reset();
    return result;
  }, initialActionState);

  return (
    <Card>
      <CardHeader title="Termine" subtitle="Anstehende Ereignisse für das Dashboard" />
      {events.length > 0 && (
        <ul className="divide-y divide-ink-border mb-3">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-parchment">{ev.label}</span>
              <span className="tabular text-xs text-parchment-dim whitespace-nowrap">
                {ev.event_date.split("-").reverse().join(".")}
              </span>
              <button
                type="button"
                disabled={removePending}
                onClick={() => startRemove(() => deleteEvent(ev.id))}
                aria-label="Termin entfernen"
                className="text-parchment-dim hover:text-warn shrink-0"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3 pt-2 border-t border-ink-border">
        <div className="flex-1 min-w-40">
          <Label htmlFor="event-label">Bezeichnung</Label>
          <Input id="event-label" name="label" required placeholder="z. B. Weihnachtsfeier" />
        </div>
        <div className="w-40">
          <Label htmlFor="event-date">Datum</Label>
          <Input id="event-date" name="event_date" type="date" required />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "…" : "+ Termin hinzufügen"}
        </Button>
      </form>
      {state?.error && <p className="text-xs text-warn mt-2">{state.error}</p>}
    </Card>
  );
}
