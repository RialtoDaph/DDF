"use client";

import { useActionState, useState } from "react";
import { createTask } from "./actions";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function TaskForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createTask, initialActionState);
  const [open, setOpen] = useState(false);
  const [prevSuccess, setPrevSuccess] = useState(false);

  // Close the form once the action reports success — the task list below
  // re-renders from revalidatePath, and closing (rather than leaving the
  // filled-in form sitting there) is the visible confirmation that it saved.
  if (state.success && !prevSuccess) {
    setPrevSuccess(true);
    setOpen(false);
  } else if (!state.success && prevSuccess) {
    setPrevSuccess(false);
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Neue Aufgabe
      </Button>
    );
  }

  return (
    <form action={formAction} className="paper-card p-4 space-y-3">
      <div>
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" required placeholder="z. B. Theke abwischen" />
      </div>
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="assigned_to">Zugewiesen an</Label>
          <Select id="assigned_to" name="assigned_to" defaultValue="">
            <option value="">— offen —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="due_date">Faellig am</Label>
          <Input id="due_date" name="due_date" type="date" />
        </div>
      </div>
      <div>
        <Label htmlFor="recurrence">Wiederholung</Label>
        <Select id="recurrence" name="recurrence" defaultValue="none">
          <option value="none">Keine</option>
          <option value="daily">Taeglich</option>
          <option value="weekly">Woechentlich</option>
        </Select>
      </div>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Aufgabe anlegen"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
