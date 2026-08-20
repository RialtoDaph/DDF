"use client";

import { useState, useTransition } from "react";
import { removeIngredient } from "../actions";
import { X } from "lucide-react";

export function IngredientRow({
  recipeId,
  menuItemId,
  name,
  unit,
  amount,
  lineCost,
  canManage,
}: {
  recipeId: string;
  menuItemId: string;
  name: string;
  unit: string;
  amount: number;
  lineCost: number;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await removeIngredient(recipeId, menuItemId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <li className="py-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-parchment">
          {name} <span className="text-parchment-dim">— {amount} {unit}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="tabular text-parchment-dim">{lineCost.toFixed(2)} €</span>
          {canManage && (
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              aria-label="Zutat entfernen"
              className="text-parchment-dim hover:text-warn"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-warn mt-0.5">{error}</p>}
    </li>
  );
}
