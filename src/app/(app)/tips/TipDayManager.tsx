"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { saveTipDay, deleteTipDay } from "./actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { type ActionState, initialActionState } from "@/lib/actionState";
import { KITCHEN_SHARE_RATIO } from "@/lib/tips";
import type { TipDay } from "@/lib/tips";

interface EligibleUser {
  id: string;
  name: string;
}

export function TipDayManager({
  days,
  eligibleUsers,
  defaultDate,
}: {
  days: TipDay[];
  eligibleUsers: EligibleUser[];
  defaultDate: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [removePending, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<TipDay | null>(null);
  const [amountInput, setAmountInput] = useState("");

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await saveTipDay(prev, fd);
    if (result?.success) {
      formRef.current?.reset();
      setEditingDay(null);
      setAmountInput("");
    }
    return result;
  }, initialActionState);

  function startEdit(day: TipDay) {
    setEditingDay(day);
    setAmountInput(String(day.total_amount));
  }

  function cancelEdit() {
    setEditingDay(null);
    setAmountInput("");
    formRef.current?.reset();
  }

  function handleRemove(id: string) {
    setRemoveError(null);
    startRemove(async () => {
      const res = await deleteTipDay(id);
      if (res?.error) setRemoveError(res.error);
      if (editingDay?.id === id) cancelEdit();
    });
  }

  const amount = Number(amountInput.replace(",", "."));
  const previewValid = Number.isFinite(amount) && amount > 0;
  const formKey = editingDay?.id ?? "new";

  return (
    <Card>
      <CardHeader title="Trinkgeld erfassen" subtitle="Ein Eintrag pro Tag — Betrag und wer gearbeitet hat." />

      {days.length > 0 && (
        <ul className="divide-y divide-ink-border mb-3">
          {days.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2">
              <button type="button" onClick={() => startEdit(d)} className="text-left flex-1 min-w-0">
                <span className="text-sm text-parchment block">
                  {d.tip_date.split("-").reverse().join(".")} · {d.total_amount.toFixed(2)} €
                </span>
                <span className="text-xs text-parchment-dim">
                  {d.workers.length} Person{d.workers.length === 1 ? "" : "en"} · Kueche {d.kitchen_share.toFixed(2)} €
                </span>
              </button>
              <button
                type="button"
                disabled={removePending}
                onClick={() => handleRemove(d.id)}
                aria-label="Eintrag loeschen"
                className="text-parchment-dim hover:text-warn shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {removeError && <p className="text-xs text-warn mb-3">{removeError}</p>}

      <form ref={formRef} action={formAction} className="space-y-3 pt-2 border-t border-ink-border">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Label htmlFor="tip-date">Datum</Label>
            <Input id="tip-date" name="tip_date" type="date" required defaultValue={editingDay?.tip_date ?? defaultDate} key={`date-${formKey}`} />
          </div>
          <div className="w-40">
            <Label htmlFor="tip-amount">Trinkgeld gesamt (€)</Label>
            <Input
              id="tip-amount"
              name="total_amount"
              type="number"
              step="0.01"
              min="0"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
        </div>
        {previewValid && (
          <p className="text-xs text-parchment-dim">
            Kueche ({Math.round(KITCHEN_SHARE_RATIO * 100)}%): {(amount * KITCHEN_SHARE_RATIO).toFixed(2)} € · Team-Anteil:{" "}
            {(amount * (1 - KITCHEN_SHARE_RATIO)).toFixed(2)} €
          </p>
        )}

        <div>
          <Label>Wer hat gearbeitet?</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {eligibleUsers.map((u) => (
              <label
                key={`${formKey}-${u.id}`}
                className="flex items-center gap-1.5 rounded-full border border-ink-border px-3 py-1.5 text-sm text-parchment has-[:checked]:border-wine has-[:checked]:text-wine has-[:checked]:bg-wine/10 cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="worker_ids"
                  value={u.id}
                  defaultChecked={editingDay?.workers.some((w) => w.id === u.id) ?? false}
                  className="sr-only"
                />
                {u.name}
              </label>
            ))}
            {eligibleUsers.length === 0 && <p className="text-sm text-parchment-dim">Keine aktiven Nutzer gefunden.</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "…" : editingDay ? "Eintrag aktualisieren" : "+ Tag hinzufuegen"}
          </Button>
          {editingDay && (
            <button type="button" onClick={cancelEdit} className="text-xs text-parchment-dim hover:text-parchment">
              Abbrechen
            </button>
          )}
        </div>
      </form>
      {state?.error && <p className="text-xs text-warn mt-2">{state.error}</p>}
    </Card>
  );
}
