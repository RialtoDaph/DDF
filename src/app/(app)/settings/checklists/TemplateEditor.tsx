"use client";

import { useActionState, useState } from "react";
import { addTemplateItem } from "../actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { type ActionState, initialActionState } from "@/lib/actionState";
import { TemplateItemRow } from "./TemplateItemRow";
import { categoryOptionsFor } from "@/app/(app)/checklists/shared/lib";
import type { ChecklistTemplateItem, ChecklistType } from "@/lib/database.types";

export function TemplateEditor({
  templateId,
  type,
  title,
  items,
}: {
  templateId: string;
  type: ChecklistType;
  title: string;
  items: ChecklistTemplateItem[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addTemplateItem, initialActionState);
  const categoryOptions = categoryOptionsFor(type);
  const [prevSuccess, setPrevSuccess] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Clear the "Neuer Punkt" form once the item is saved — otherwise the
  // typed text just sits there with no confirmation, indistinguishable
  // from the save having silently failed.
  if (state.success && !prevSuccess) {
    setPrevSuccess(true);
    setResetKey((k) => k + 1);
  } else if (!state.success && prevSuccess) {
    setPrevSuccess(false);
  }

  return (
    <Card>
      <CardHeader title={title} subtitle={`${items.length} Punkte`} />
      {items.length > 0 && (
        <ul className="divide-y divide-ink-border mb-4">
          {items.map((item, i) => (
            <TemplateItemRow
              key={`${item.text}-${i}`}
              templateId={templateId}
              type={type}
              index={i}
              item={item}
              isFirst={i === 0}
              isLast={i === items.length - 1}
            />
          ))}
        </ul>
      )}

      <form key={resetKey} action={formAction} className="space-y-3 pt-2 border-t border-ink-border">
        <input type="hidden" name="template_id" value={templateId} />
        <div>
          <Label htmlFor={`text-${templateId}`}>Neuer Punkt</Label>
          <Input id={`text-${templateId}`} name="text" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`category-${templateId}`}>Kategorie</Label>
            <Select id={`category-${templateId}`} name="category" defaultValue="allgemein">
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-parchment-dim self-end pb-2">
            <input type="checkbox" name="requires_photo" className="accent-wine" />
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
