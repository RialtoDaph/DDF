"use client";

import { useState, useTransition } from "react";
import { toggleSlotFlip } from "./actions";
import { cn } from "@/lib/utils";
import type { SlotData } from "./lib";

export function WineBottle({ slot, onSelect }: { slot: SlotData; onSelect: () => void }) {
  const [flipped, setFlipped] = useState(slot.flipped);
  const [, startTransition] = useTransition();

  function handleRotate(e: React.MouseEvent) {
    e.stopPropagation();
    const prev = flipped;
    setFlipped(!flipped);
    startTransition(async () => {
      const res = await toggleSlotFlip(slot.id);
      if (res?.error) setFlipped(prev);
    });
  }

  const filled = !!slot.item;
  const typeClass = slot.item?.wineType ?? null;

  return (
    <div className="relative flex w-[30px] flex-col items-center">
      <button
        type="button"
        onClick={handleRotate}
        aria-label={`Flasche ${slot.slotNumber} drehen`}
        title="Drehen"
        className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-ink-border bg-ink-card text-[0.62rem] text-parchment-dim opacity-60 hover:border-wine-soft hover:text-parchment hover:opacity-100"
      >
        ↻
      </button>
      <button
        type="button"
        onClick={onSelect}
        aria-label={filled ? `Flasche ${slot.slotNumber}, ${slot.item!.name}` : `Flasche ${slot.slotNumber}, leer`}
        className="flex w-full flex-col items-center gap-0.5 rounded-md p-0.5 hover:bg-parchment/5"
      >
        <span className={cn("flex flex-col items-center transition-transform", flipped && "rotate-180")}>
          <span
            className={cn(
              "h-1 w-2 rounded-t-sm",
              filled ? "bg-wine-deep" : "border border-dashed border-parchment-dim",
            )}
          />
          <span
            className={cn(
              "h-[9px] w-1.5",
              filled ? "bg-ink-raised" : "border-l border-r border-dashed border-parchment-dim",
            )}
          />
          <span
            className={cn(
              "flex h-[34px] w-6 items-center justify-center rounded-b-[9px] rounded-t-sm",
              filled ? "bg-ink-raised" : "border border-dashed border-parchment-dim",
            )}
          >
            <span
              className={cn(
                "h-[42%] w-[88%] rounded-sm",
                filled && typeClass === "rot" && "bg-wine",
                filled && typeClass === "weiss" && "bg-wine-white",
                filled && typeClass === "rose" && "bg-wine-rose",
                filled && typeClass === "sekt" && "bg-wine-sekt",
                filled && !typeClass && "bg-ink-border",
              )}
            />
          </span>
        </span>
        <span className="font-mono text-[0.58rem] text-parchment-dim">{slot.slotNumber}</span>
      </button>
    </div>
  );
}
