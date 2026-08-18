"use client";

import { useActionState } from "react";
import { createSupplier } from "../actions";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function NewSupplierForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createSupplier, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="z. B. Getränke Meier GmbH" />
      </div>
      <div>
        <Label htmlFor="category">Kategorie</Label>
        <Input id="category" name="category" placeholder="Spirituosen, Getränke, Frischware, …" />
      </div>
      <div>
        <Label htmlFor="contact">Kontakt</Label>
        <Input id="contact" name="contact" placeholder="Telefon / E-Mail / Ansprechpartner" />
      </div>
      <div>
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gespeichert…" : "Lieferant anlegen"}
      </Button>
    </form>
  );
}
