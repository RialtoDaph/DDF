"use client";

import { useActionState, useRef } from "react";
import { createOrderItem } from "./actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function NewOrderItemForm({ supplierNames }: { supplierNames: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await createOrderItem(prev, fd);
    if (result?.success) formRef.current?.reset();
    return result;
  }, initialActionState);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-40">
        <Label htmlFor="item_name">Artikel</Label>
        <Input id="item_name" name="item_name" required placeholder="z. B. Rye Whiskey" />
      </div>
      <div className="w-28">
        <Label htmlFor="quantity">Menge</Label>
        <Input id="quantity" name="quantity" placeholder="z. B. 2 Flaschen" />
      </div>
      <div className="w-48">
        <Label htmlFor="supplier_name">Von wo</Label>
        <Input id="supplier_name" name="supplier_name" list="order-supplier-names" placeholder="Lieferant" />
        <datalist id="order-supplier-names">
          {supplierNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      <div className="flex-1 min-w-40">
        <Label htmlFor="notes">Notiz</Label>
        <Input id="notes" name="notes" placeholder="optional" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "+ Hinzufügen"}
      </Button>
      {state?.error && <p className="text-xs text-warn w-full">{state.error}</p>}
    </form>
  );
}
