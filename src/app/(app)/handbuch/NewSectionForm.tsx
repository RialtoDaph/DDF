"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createSection } from "./actions";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function NewSectionForm({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const result = await createSection(prev, fd);
      if (result?.success) formRef.current?.reset();
      return result;
    },
    initialActionState,
  );

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full">
        <Plus size={16} />
        Abschnitt hinzufuegen
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader title="Neuer Abschnitt" />
      <form ref={formRef} action={formAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="new-title">Titel</Label>
            <Input id="new-title" name="title" placeholder="Zapfanlage reinigen" required />
          </div>
          <div>
            <Label htmlFor="new-category">Kategorie</Label>
            <Input
              id="new-category"
              name="category"
              list="handbook-categories"
              placeholder="Reinigung"
              defaultValue={categories[0] ?? ""}
            />
            <datalist id="handbook-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <Label htmlFor="new-body">Inhalt</Label>
          <Textarea id="new-body" name="body" rows={8} placeholder={"Schritt 1 …\nSchritt 2 …"} />
        </div>
        {state?.error && <p className="text-sm text-warn">{state.error}</p>}
        {state?.success && <p className="text-sm text-done">Abschnitt angelegt.</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Wird angelegt…" : "Anlegen"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Schliessen
          </Button>
        </div>
      </form>
    </Card>
  );
}
