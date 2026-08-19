"use client";

import { useActionState } from "react";
import { updateItem } from "../actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { ItemCategory } from "@/lib/database.types";
import { type ActionState, initialActionState } from "@/lib/actionState";
import { UNIT_SUGGESTIONS } from "../units";

export function EditItemForm({
  item,
}: {
  item: {
    id: string;
    name: string;
    category: ItemCategory;
    unit: string;
    unit_volume_ml: number | null;
    par_level: number;
    purchase_price: number | null;
    is_perishable: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateItem, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={item.id} />
      <div>
        <Label htmlFor="edit-name">Name</Label>
        <Input id="edit-name" name="name" defaultValue={item.name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edit-category">Kategorie</Label>
          <Select id="edit-category" name="category" defaultValue={item.category}>
            <option value="spirits">Spirituosen</option>
            <option value="beer">Bier</option>
            <option value="wine">Wein</option>
            <option value="mixer">Mixer</option>
            <option value="garnish">Garnitur</option>
            <option value="herbs_produce">Frische Kräuter & Früchte</option>
            <option value="consumable">Verbrauch</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="edit-unit">Einheit</Label>
          <Input id="edit-unit" name="unit" defaultValue={item.unit} required list="unit-suggestions" />
          <datalist id="unit-suggestions">
            {UNIT_SUGGESTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <Label htmlFor="edit-unit-volume">Volumen pro Einheit (ml, optional)</Label>
        <Input
          id="edit-unit-volume"
          name="unit_volume_ml"
          type="number"
          step="1"
          min="0"
          defaultValue={item.unit_volume_ml ?? ""}
          placeholder="z. B. 700 für eine 0,7l-Flasche"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edit-par">Sollbestand</Label>
          <Input id="edit-par" name="par_level" type="number" step="0.01" min="0" defaultValue={item.par_level} required />
        </div>
        <div>
          <Label htmlFor="edit-price">Einkaufspreis (€)</Label>
          <Input
            id="edit-price"
            name="purchase_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={item.purchase_price ?? ""}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-parchment-dim">
        <input type="checkbox" name="is_perishable" defaultChecked={item.is_perishable} className="accent-wine" />
        Verderblich
      </label>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      {state?.success && <p className="text-sm text-done">Gespeichert.</p>}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending ? "Wird gespeichert…" : "Stammdaten speichern"}
      </Button>
    </form>
  );
}
