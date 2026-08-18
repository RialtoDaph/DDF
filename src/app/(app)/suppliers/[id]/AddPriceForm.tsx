"use client";

import { useActionState } from "react";
import { addPriceEntry } from "../actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function AddPriceForm({
  supplierId,
  items,
}: {
  supplierId: string;
  items: { id: string; name: string; unit: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addPriceEntry, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="supplier_id" value={supplierId} />
      <div>
        <Label htmlFor="item_id">Artikel</Label>
        <Select id="item_id" name="item_id" required defaultValue="">
          <option value="" disabled>
            — auswählen —
          </option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.unit})
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="price">Preis (€)</Label>
          <Input id="price" name="price" type="number" step="0.01" min="0" required />
        </div>
        <div>
          <Label htmlFor="valid_from">Gültig ab</Label>
          <Input id="valid_from" name="valid_from" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Wird gespeichert…" : "Preis hinzufügen"}
      </Button>
    </form>
  );
}
