"use client";

import { useActionState, useRef, useState } from "react";
import { createCabinet } from "./actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function NewCabinetForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await createCabinet(prev, fd);
    if (result?.success) {
      formRef.current?.reset();
      setOpen(false);
    }
    return result;
  }, initialActionState);

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        + Schrank hinzufügen
      </Button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-40">
        <Label htmlFor="cabinet-name">Name</Label>
        <Input id="cabinet-name" name="name" required placeholder="z. B. Schrank D" />
      </div>
      <div className="w-32">
        <Label htmlFor="cabinet-temp">Temperatur °C</Label>
        <Input id="cabinet-temp" name="temperature_c" type="number" step="0.1" placeholder="12" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Anlegen"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Abbrechen
      </Button>
      {state?.error && <p className="text-xs text-warn w-full">{state.error}</p>}
    </form>
  );
}
