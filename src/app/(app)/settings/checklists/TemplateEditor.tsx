"use client";

import { useActionState, useTransition } from "react";
import { addTemplateItem, removeTemplateItem } from "../actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { type ActionState, initialActionState } from "@/lib/actionState";
import { X } from "lucide-react";
import type { ChecklistTemplateItem } from "@/lib/database.types";

export function TemplateEditor({
  templateId,
  title,
  items,
}: {
  templateId: string;
  title: string;
  items: ChecklistTemplateItem[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addTemplateItem, initialActionState);
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader title={title} subtitle={`${items.length} Punkte`} />
      {items.length > 0 && (
        <ul className="divide-y divide-ink-border mb-4">
          {items.map((item, i) => (
            <li key={`${item.text}-${i}`} className="flex items-center justify-between gap-2 py-2">
              <div>
                <p className="text-sm text-parchment">{item.text}</p>
                <p className="text-xs text-parchment-dim">
                  {item.category}
                  {item.requires_photo ? " · fotopflichtig" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => startTransition(() => removeTemplateItem(templateId, i))}
                aria-label="Punkt entfernen"
                className="text-parchment-dim hover:text-warn shrink-0"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-3 pt-2 border-t border-ink-border">
        <input type="hidden" name="template_id" value={templateId} />
        <div>
          <Label htmlFor={`text-${templateId}`}>Neuer Punkt</Label>
          <Input id={`text-${templateId}`} name="text" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`category-${templateId}`}>Kategorie</Label>
            <Select id={`category-${templateId}`} name="category" defaultValue="allgemein">
              <option value="allgemein">Allgemein</option>
              <option value="verschluss">Verschluss</option>
              <option value="sauberkeit">Sauberkeit</option>
              <option value="geraete">Geräte</option>
              <option value="beleuchtung">Beleuchtung</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-parchment-dim self-end pb-2">
            <input type="checkbox" name="requires_photo" className="accent-brass" />
            Fotopflichtig
          </label>
        </div>
        {state?.error && <p className="text-sm text-warn">{state.error}</p>}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Punkt hinzufügen"}
        </Button>
      </form>
    </Card>
  );
}
