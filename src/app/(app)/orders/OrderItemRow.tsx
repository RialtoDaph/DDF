"use client";

import { useActionState, useState, useTransition } from "react";
import { setOrderItemStatus, updateOrderItem, deleteOrderItem } from "./actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderItemStatus } from "@/lib/database.types";

export function OrderItemRow({
  item,
}: {
  item: {
    id: string;
    item_name: string;
    quantity: string | null;
    supplier_name: string | null;
    notes: string | null;
    status: OrderItemStatus;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [state, formAction, savePending] = useActionState<ActionState, FormData>(updateOrderItem, initialActionState);
  const [prevSuccess, setPrevSuccess] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const ordered = item.status === "ordered";

  if (state.success && !prevSuccess) {
    setPrevSuccess(true);
    setEditing(false);
  } else if (!state.success && prevSuccess) {
    setPrevSuccess(false);
  }

  function toggle() {
    setRowError(null);
    startTransition(async () => {
      const res = await setOrderItemStatus(item.id, ordered ? "open" : "ordered");
      if (res?.error) setRowError(res.error);
    });
  }

  function remove() {
    if (!window.confirm(`"${item.item_name}" wirklich loeschen?`)) return;
    setRowError(null);
    startTransition(async () => {
      const res = await deleteOrderItem(item.id);
      if (res?.error) setRowError(res.error);
    });
  }

  if (editing) {
    return (
      <li className="py-3">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={item.id} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`item_name-${item.id}`}>Artikel</Label>
              <Input id={`item_name-${item.id}`} name="item_name" defaultValue={item.item_name} required />
            </div>
            <div>
              <Label htmlFor={`quantity-${item.id}`}>Menge</Label>
              <Input id={`quantity-${item.id}`} name="quantity" defaultValue={item.quantity ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`supplier_name-${item.id}`}>Von wo</Label>
              <Input id={`supplier_name-${item.id}`} name="supplier_name" defaultValue={item.supplier_name ?? ""} />
            </div>
            <div>
              <Label htmlFor={`notes-${item.id}`}>Notiz</Label>
              <Input id={`notes-${item.id}`} name="notes" defaultValue={item.notes ?? ""} />
            </div>
          </div>
          {state?.error && <p className="text-sm text-warn">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={savePending}>
              {savePending ? "Wird gespeichert…" : "Speichern"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        onClick={toggle}
        disabled={pending}
        aria-label={ordered ? "Als offen markieren" : "Als bestellt markieren"}
        className={cn(
          "mt-0.5 h-[18px] w-[18px] shrink-0 rounded-[5px] border-[1.5px] flex items-center justify-center transition-colors",
          ordered ? "bg-done border-done" : "border-ink-border hover:border-wine",
        )}
      >
        {ordered && <span className="text-ink text-[10px]">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", ordered ? "text-parchment-dim line-through" : "text-parchment")}>
          {item.item_name}
          {item.quantity && <span className="text-parchment-dim"> — {item.quantity}</span>}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.supplier_name && <span className="text-xs text-wine-soft">{item.supplier_name}</span>}
          {item.notes && <span className="text-xs text-parchment-dim">{item.notes}</span>}
        </div>
        {rowError && <p className="text-xs text-warn mt-1">{rowError}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          aria-label="Eintrag bearbeiten"
          className="text-parchment-dim hover:text-wine p-1"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={remove}
          disabled={pending}
          aria-label="Eintrag loeschen"
          className="text-parchment-dim hover:text-warn p-1"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}
