"use client";

import { useActionState } from "react";
import { createMenuItem } from "../actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function NewMenuItemForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createMenuItem, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="z. B. Old Fashioned" />
      </div>
      <div>
        <Label htmlFor="sale_price">Verkaufspreis (€)</Label>
        <Input id="sale_price" name="sale_price" type="number" step="0.01" min="0" required />
      </div>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gespeichert…" : "Anlegen"}
      </Button>
    </form>
  );
}
