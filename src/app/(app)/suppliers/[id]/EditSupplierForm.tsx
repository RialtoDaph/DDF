"use client";

import { useActionState } from "react";
import { updateSupplier } from "../actions";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function EditSupplierForm({
  supplier,
}: {
  supplier: { id: string; name: string; contact: string | null; category: string | null; notes: string | null };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateSupplier, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={supplier.id} />
      <div>
        <Label htmlFor="edit-name">Name</Label>
        <Input id="edit-name" name="name" defaultValue={supplier.name} required />
      </div>
      <div>
        <Label htmlFor="edit-category">Kategorie</Label>
        <Input id="edit-category" name="category" defaultValue={supplier.category ?? ""} />
      </div>
      <div>
        <Label htmlFor="edit-contact">Kontakt</Label>
        <Input id="edit-contact" name="contact" defaultValue={supplier.contact ?? ""} />
      </div>
      <div>
        <Label htmlFor="edit-notes">Notizen</Label>
        <Textarea id="edit-notes" name="notes" rows={2} defaultValue={supplier.notes ?? ""} />
      </div>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      {state?.success && <p className="text-sm text-done">Gespeichert.</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Wird gespeichert…" : "Speichern"}
      </Button>
    </form>
  );
}
