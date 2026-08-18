"use client";

import { useActionState } from "react";
import { updateMenuItem } from "../actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function EditMenuItemForm({ item }: { item: { id: string; name: string; sale_price: number } }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateMenuItem, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={item.id} />
      <div>
        <Label htmlFor="edit-name">Name</Label>
        <Input id="edit-name" name="name" defaultValue={item.name} required />
      </div>
      <div>
        <Label htmlFor="edit-sale-price">Verkaufspreis (€)</Label>
        <Input id="edit-sale-price" name="sale_price" type="number" step="0.01" min="0" defaultValue={item.sale_price} required />
      </div>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      {state?.success && <p className="text-sm text-done">Gespeichert.</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Wird gespeichert…" : "Speichern"}
      </Button>
    </form>
  );
}
