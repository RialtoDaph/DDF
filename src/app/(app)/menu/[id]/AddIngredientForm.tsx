"use client";

import { useActionState, useState } from "react";
import { addIngredient } from "../actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";
import { RECIPE_AMOUNT_HELPERS } from "../../inventory/units";

export function AddIngredientForm({
  menuItemId,
  items,
}: {
  menuItemId: string;
  items: { id: string; name: string; unit: string; unit_volume_ml: number | null }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addIngredient, initialActionState);
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");

  const selectedItem = items.find((i) => i.id === selectedId);
  // A recipe amount is stored in ml whenever the ingredient has a known
  // bottle size — that's what the cost math (purchase_price ÷
  // unit_volume_ml) assumes — regardless of the item's own stock-counting
  // unit (Flasche, Kiste, ...). Otherwise it's stored in the item's own
  // unit directly (kg, l, ...).
  const effectiveUnit = selectedItem?.unit_volume_ml ? "ml" : (selectedItem?.unit ?? "");
  const helper = RECIPE_AMOUNT_HELPERS[effectiveUnit.trim().toLowerCase()];

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
              {i.name} ({i.unit_volume_ml ? "ml" : i.unit})
            </option>
          ))}
        </Select>
      </div>
      <div className="w-28">
        <Label htmlFor="amount">Menge{effectiveUnit ? ` (${effectiveUnit})` : ""}</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.001"
          min="0.001"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      {helper && (
        <div className="w-24">
          <Label htmlFor="amount-helper">oder {helper.label}</Label>
          <Input
            id="amount-helper"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="z. B. 5"
            onChange={(e) => setAmount(e.target.value ? String(Number(e.target.value) * helper.factor) : "")}
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
