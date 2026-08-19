"use client";

import { useActionState, useState } from "react";
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
  const [selectedId, setSelectedId] = useState("");
  const [amountMl, setAmountMl] = useState("");

  // Recipe amounts are always stored in the ingredient's own unit (ml, here)
  // so existing recipe rows and cost math don't need to know about cl at
  // all — this is just a convenience calculator for the person typing.
  const selectedUnit = items.find((i) => i.id === selectedId)?.unit;
  const showClHelper = selectedUnit === "ml";

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="menu_item_id" value={menuItemId} />
      <div className="flex-1 min-w-40">
        <Label htmlFor="inventory_item_id">Zutat</Label>
        <Select
          id="inventory_item_id"
          name="inventory_item_id"
          required
          defaultValue=""
          onChange={(e) => setSelectedId(e.target.value)}
        >
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
        <Label htmlFor="amount">Menge (ml)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.001"
          min="0.001"
          required
          value={amountMl}
          onChange={(e) => setAmountMl(e.target.value)}
        />
      </div>
      {showClHelper && (
        <div className="w-24">
          <Label htmlFor="amount-cl">oder cl</Label>
          <Input
            id="amount-cl"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="z. B. 5"
            onChange={(e) => setAmountMl(e.target.value ? String(Number(e.target.value) * 10) : "")}
          />
        </div>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "…" : "Hinzufügen"}
      </Button>
      {state?.error && <p className="text-sm text-warn w-full">{state.error}</p>}
    </form>
  );
}
