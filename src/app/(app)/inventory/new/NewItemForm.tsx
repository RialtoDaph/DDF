"use client";

import { useActionState } from "react";
import { createItem } from "../actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState = { error: "" };

export function NewItemForm() {
  const [state, formAction, pending] = useActionState(createItem, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="z. B. Havana Club 7" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Kategorie</Label>
          <Select id="category" name="category" required defaultValue="spirits">
            <option value="spirits">Spirituosen</option>
            <option value="beer">Bier</option>
            <option value="wine">Wein</option>
            <option value="mixer">Mixer</option>
            <option value="garnish">Garnitur</option>
            <option value="consumable">Verbrauch</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="unit">Einheit</Label>
          <Input id="unit" name="unit" required placeholder="Flasche, kg, Stk." />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="current_stock">Anfangsbestand</Label>
          <Input id="current_stock" name="current_stock" type="number" step="0.01" min="0" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="par_level">Sollbestand</Label>
          <Input id="par_level" name="par_level" type="number" step="0.01" min="0" required />
        </div>
      </div>
      <div>
        <Label htmlFor="purchase_price">Einkaufspreis (€)</Label>
        <Input id="purchase_price" name="purchase_price" type="number" step="0.01" min="0" />
      </div>
      <label className="flex items-center gap-2 text-sm text-parchment-dim">
        <input type="checkbox" name="is_perishable" className="accent-wine" />
        Verderblich (Ablauf-Tracking)
      </label>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gespeichert…" : "Artikel anlegen"}
      </Button>
    </form>
  );
}
