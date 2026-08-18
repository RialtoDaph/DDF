"use client";

import { useActionState } from "react";
import { createModule } from "../actions";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function NewModuleForm({ menuItems }: { menuItems: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createModule, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" required placeholder="z. B. Old Fashioned zubereiten" />
      </div>
      <div>
        <Label htmlFor="menu_item_id">Verknüpfter Menüpunkt</Label>
        <Select id="menu_item_id" name="menu_item_id" defaultValue="">
          <option value="">— optional —</option>
          {menuItems.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div>
        <Label htmlFor="video">Video</Label>
        <input
          id="video"
          name="video"
          type="file"
          accept="video/*"
          className="block w-full text-sm text-parchment-dim file:mr-3 file:rounded-md file:border-0 file:bg-brass file:px-3 file:py-2 file:text-ink file:text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gespeichert…" : "Modul anlegen"}
      </Button>
    </form>
  );
}
