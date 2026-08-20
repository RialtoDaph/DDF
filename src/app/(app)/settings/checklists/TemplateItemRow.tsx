"use client";

import { useActionState, useState, useTransition } from "react";
import { updateTemplateItem, removeTemplateItem, moveTemplateItem } from "../actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";
import { X, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { categoryOptionsFor } from "@/app/(app)/checklists/shared/lib";
import type { ChecklistTemplateItem, ChecklistType } from "@/lib/database.types";

export function TemplateItemRow({
  templateId,
  type,
  index,
  item,
  isFirst,
  isLast,
}: {
  templateId: string;
  type: ChecklistType;
  index: number;
  item: ChecklistTemplateItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const categoryOptions = categoryOptionsFor(type);
  // The item may already hold a category outside the current allow-list
  // (leftover bad data, or a template that used to be closing) — keep it
  // selectable so editing the item doesn't silently reassign its category.
  const options = categoryOptions.some((c) => c.value === item.category)
    ? categoryOptions
    : [...categoryOptions, { value: item.category, label: item.category }];
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction, savePending] = useActionState<ActionState, FormData>(
    updateTemplateItem,
    initialActionState,
  );

  if (editing) {
    return (
      <li className="py-3">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="template_id" value={templateId} />
          <input type="hidden" name="index" value={index} />
          <div>
            <Label htmlFor={`edit-text-${templateId}-${index}`}>Text</Label>
            <Input id={`edit-text-${templateId}-${index}`} name="text" defaultValue={item.text} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`edit-category-${templateId}-${index}`}>Kategorie</Label>
              <Select id={`edit-category-${templateId}-${index}`} name="category" defaultValue={item.category}>
                {options.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-parchment-dim self-end pb-2">
              <input type="checkbox" name="requires_photo" defaultChecked={item.requires_photo} className="accent-wine" />
              Fotopflichtig
            </label>
          </div>
          {state?.error && <p className="text-sm text-warn">{state.error}</p>}
          {state?.success && <p className="text-sm text-done">Gespeichert.</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" disabled={savePending}>
              {savePending ? "Wird gespeichert…" : "Speichern"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              {state?.success ? "Fertig" : "Abbrechen"}
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="text-sm text-parchment truncate">{item.text}</p>
        <p className="text-xs text-parchment-dim">
          {item.category}
          {item.requires_photo ? " · fotopflichtig" : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => startTransition(() => moveTemplateItem(templateId, index, "up"))}
          disabled={isFirst || pending}
          aria-label="Nach oben verschieben"
          className="text-parchment-dim hover:text-wine disabled:opacity-30"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => moveTemplateItem(templateId, index, "down"))}
          disabled={isLast || pending}
          aria-label="Nach unten verschieben"
          className="text-parchment-dim hover:text-wine disabled:opacity-30"
        >
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Punkt bearbeiten"
          className="text-parchment-dim hover:text-wine ml-1"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => removeTemplateItem(templateId, index))}
          disabled={pending}
          aria-label="Punkt entfernen"
          className="text-parchment-dim hover:text-warn ml-1"
        >
          <X size={14} />
        </button>
      </div>
    </li>
  );
}
