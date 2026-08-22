"use client";

import { useState } from "react";
import { WineBottle } from "./WineBottle";
import { cn } from "@/lib/utils";
import { rackSummary } from "./lib";
import type { SlotData } from "./lib";

export function WineRack({
  rackNumber,
  slots,
  onSelectSlot,
}: {
  rackNumber: number;
  slots: SlotData[];
  onSelectSlot: (slot: SlotData) => void;
}) {
  const [open, setOpen] = useState(false);
  const filledCount = slots.filter((s) => s.item).length;
  const isEmpty = filledCount === 0;
  const isLow = filledCount > 0 && filledCount <= 2;

  return (
    <div
      className={cn(
        "rounded-lg border-l-[3px] bg-ink-raised",
        isEmpty ? "border-l-parchment-dim border-dashed border bg-transparent" : "border-l-wine-soft border border-ink-border",
        open && "border-wine border-l-wine",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Fach ${rackNumber}, ${rackSummary(slots)}, ${filledCount} von ${slots.length} Flaschen`}
        className="flex w-full flex-col gap-1 px-2.5 py-1.5 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="w-14 shrink-0 font-mono text-[0.68rem] text-parchment-dim">Fach {rackNumber}</span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[0.78rem] font-semibold",
              isEmpty ? "italic text-parchment-dim" : "text-parchment",
            )}
          >
            {rackSummary(slots)}
          </span>
          <span className={cn("shrink-0 font-mono text-[0.72rem] tabular-nums", isLow ? "font-semibold text-warn" : "text-parchment-dim")}>
            {filledCount}/{slots.length}
          </span>
          <span className="w-3 shrink-0 text-[0.7rem] text-parchment-dim">{open ? "▾" : "▸"}</span>
        </span>
        <span className="flex gap-[3px] pl-[calc(3.5rem+0.75rem)]">
          {slots.map((s) => (
            <span
              key={s.id}
              className={cn(
                "h-[9px] w-[9px] rounded-full border",
                s.item
                  ? s.item.wineType === "rot"
                    ? "border-wine bg-wine"
                    : s.item.wineType === "weiss"
                      ? "border-wine-white bg-wine-white"
                      : s.item.wineType === "rose"
                        ? "border-wine-rose bg-wine-rose"
                        : s.item.wineType === "sekt"
                          ? "border-wine-sekt bg-wine-sekt"
                          : "border-ink-border bg-ink-border"
                  : "border-ink-border bg-transparent",
              )}
            />
          ))}
        </span>
      </button>

      {open && (
        <div className="flex flex-wrap gap-2.5 px-2.5 pb-3 pl-[calc(3.5rem+0.75rem)]">
          {slots.map((slot) => (
            <WineBottle key={slot.id} slot={slot} onSelect={() => onSelectSlot(slot)} />
          ))}
        </div>
      )}
    </div>
  );
}
