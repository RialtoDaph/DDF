"use client";

import { useActionState } from "react";
import { updateSubmissionMeta, saveHandoverNote } from "./actions";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function ClosingMetaForm({
  submissionId,
  cashCount,
  incidentNotes,
  shift,
  readOnly,
}: {
  submissionId: string;
  cashCount: number | null;
  incidentNotes: string | null;
  shift: string | null;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, fd) => {
    return updateSubmissionMeta(fd);
  }, initialActionState);

  return (
    <Card>
      <CardHeader title="Kassenabschluss" />
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="submission_id" value={submissionId} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="shift">Schicht</Label>
            <Input id="shift" name="shift" defaultValue={shift ?? ""} disabled={readOnly} placeholder="Abend" />
          </div>
          <div>
            <Label htmlFor="cash_count">Kassenbestand (€)</Label>
            <Input
              id="cash_count"
              name="cash_count"
              type="number"
              step="0.01"
              defaultValue={cashCount ?? ""}
              disabled={readOnly}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="incident_notes">Vorkommnisse</Label>
          <Textarea id="incident_notes" name="incident_notes" defaultValue={incidentNotes ?? ""} disabled={readOnly} rows={2} />
        </div>
        {state?.error && <p className="text-sm text-warn">{state.error}</p>}
        {!readOnly && (
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Wird gespeichert…" : "Speichern"}
          </Button>
        )}
      </form>
    </Card>
  );
}

export function HandoverNoteForm({ readOnly }: { readOnly: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, fd) => {
    return saveHandoverNote(fd);
  }, initialActionState);

  return (
    <Card>
      <CardHeader title="Übergabenotiz" subtitle="Fuer die naechste Schicht" />
      <form action={formAction} className="space-y-3">
        <Textarea name="content" rows={3} placeholder="Besonderheiten fuer die naechste Schicht…" disabled={readOnly} required />
        {state?.error && <p className="text-sm text-warn">{state.error}</p>}
        {state?.success && <p className="text-sm text-done">Notiz gespeichert.</p>}
        {!readOnly && (
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Wird gespeichert…" : "Notiz hinterlassen"}
          </Button>
        )}
      </form>
    </Card>
  );
}
