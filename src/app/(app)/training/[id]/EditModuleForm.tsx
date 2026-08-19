"use client";

import { useActionState, useState } from "react";
import { updateModuleRecord } from "../actions";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function EditModuleForm({ module_ }: { module_: { id: string; title: string; description: string | null } }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateModuleRecord, initialActionState);

  if (!editing) {
    return (
      <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
        Bearbeiten
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={module_.id} />
      <div>
        <Label htmlFor="edit-title">Titel</Label>
        <Input id="edit-title" name="title" defaultValue={module_.title} required />
      </div>
      <div>
        <Label htmlFor="edit-description">Beschreibung</Label>
        <Textarea id="edit-description" name="description" rows={3} defaultValue={module_.description ?? ""} />
      </div>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      {state?.success && <p className="text-sm text-done">Gespeichert.</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Fertig
        </Button>
      </div>
    </form>
  );
}
