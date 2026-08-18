"use client";

import { useTransition } from "react";
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

  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <span className="text-parchment">
        {name} <span className="text-parchment-dim">— {amount} {unit}</span>
      </span>
      <div className="flex items-center gap-3">
        <span className="tabular text-parchment-dim">{lineCost.toFixed(2)} €</span>
        {canManage && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => removeIngredient(recipeId, menuItemId))}
            aria-label="Zutat entfernen"
            className="text-parchment-dim hover:text-warn"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </li>
  );
}
