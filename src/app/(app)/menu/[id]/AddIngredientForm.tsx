"use client";

import { useActionState } from "react";
import { addIngredient } from "../actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function AddIngredientForm({
  menuItemId,
  items,
}: {
  menuItemId: string;
  items: { id: string; name: string; unit: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addIngredient, initialActionState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="menu_item_id" value={menuItemId} />
      <div className="flex-1 min-w-40">
        <Label htmlFor="inventory_item_id">Zutat</Label>
        <Select id="inventory_item_id" name="inventory_item_id" required defaultValue="">
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
      <div className="w-28">
        <Label htmlFor="amount">Menge</Label>
        <Input id="amount" name="amount" type="number" step="0.001" min="0.001" required />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "…" : "Hinzufügen"}
      </Button>
      {state?.error && <p className="text-sm text-warn w-full">{state.error}</p>}
    </form>
  );
}
