"use client";

import { useActionState, useState } from "react";
import { recordMovement } from "../actions";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

const REASONS: { value: string; label: string }[] = [
  { value: "restock", label: "Wareneingang" },
  { value: "usage", label: "Verbrauch" },
  { value: "waste", label: "Schwund/Verderb" },
  { value: "adjustment", label: "Korrektur" },
];

export function MovementForm({
  itemId,
  unit,
  suppliers,
  canAdjust,
}: {
  itemId: string;
  unit: string;
  suppliers: { id: string; name: string }[];
  canAdjust: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(recordMovement, initialActionState);
  const [reason, setReason] = useState("restock");
  const isRestock = reason === "restock";

  const availableReasons = REASONS.filter((r) => r.value !== "adjustment" || canAdjust);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="item_id" value={itemId} />
      <div>
        <Label htmlFor="reason">Vorgang</Label>
        <Select id="reason" name="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {availableReasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        {reason === "adjustment" && (
          <p className="text-xs text-wine mt-1">Korrekturen erfordern Owner/Manager-Freigabe.</p>
        )}
      </div>
      {reason === "adjustment" && (
        <div>
          <Label htmlFor="adjustment_direction">Richtung</Label>
          <Select id="adjustment_direction" name="adjustment_direction" defaultValue="out">
            <option value="out">Bestand verringern (z. B. Zählfehler, gefundener Schwund)</option>
            <option value="in">Bestand erhöhen (z. B. nicht erfasste Lieferung)</option>
          </Select>
        </div>
      )}
      <div>
        <Label htmlFor="quantity">Menge ({unit})</Label>
        <Input id="quantity" name="quantity" type="number" step="0.01" min="0.01" required />
      </div>
      {isRestock && (
        <div>
          <Label htmlFor="supplier_id">Lieferant</Label>
          <Select id="supplier_id" name="supplier_id" defaultValue="">
            <option value="">— optional —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {isRestock && (
        <div>
          <Label htmlFor="expiry_date">Ablaufdatum</Label>
          <Input id="expiry_date" name="expiry_date" type="date" />
        </div>
      )}
      <div>
        <Label htmlFor="notes">Notiz</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      {state?.success && <p className="text-sm text-done">Vorgang gespeichert.</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gespeichert…" : "Buchen"}
      </Button>
    </form>
  );
}
