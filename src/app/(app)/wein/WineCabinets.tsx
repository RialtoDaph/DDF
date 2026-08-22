"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCabinet } from "./actions";
import { WineRack } from "./WineRack";
import { WineSlotPanel, type ActiveSlot } from "./WineSlotPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { RACK_COUNT, SLOTS_PER_RACK, rackSlots, type CabinetData, type WineItem } from "./lib";

export function WineCabinets({
  cabinets,
  wineItems,
  canManage,
}: {
  cabinets: CabinetData[];
  wineItems: WineItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveSlot | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const stats = useMemo(() => {
    let total = 0;
    let low = 0;
    const capacity = cabinets.length * RACK_COUNT * SLOTS_PER_RACK;
    for (const cabinet of cabinets) {
      for (let rack = 1; rack <= RACK_COUNT; rack++) {
        const filled = rackSlots(cabinet, rack).filter((s) => s.item).length;
        total += filled;
        if (filled > 0 && filled <= 2) low++;
      }
    }
    return { total, free: capacity - total, low, capacity };
  }, [cabinets]);

  function handleMutated() {
    router.refresh();
  }

  function handleDeleteCabinet(cabinetId: string, name: string) {
    if (!window.confirm(`"${name}" wirklich löschen? Alle 135 Plätze gehen verloren.`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteCabinet(cabinetId);
      if (res?.error) {
        setDeleteError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (cabinets.length === 0) {
    return (
      <Card>
        <p className="text-sm text-parchment-dim">Noch kein Weinschrank angelegt.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink-border bg-ink-border sm:grid-cols-4">
        <div className="bg-ink-card px-5 py-4">
          <span className="block font-mono text-[1.7rem] font-semibold tabular-nums leading-none">
            {stats.total}
          </span>
          <span className="mt-2 block text-xs uppercase tracking-wide text-parchment-dim">Flaschen gesamt</span>
        </div>
        <div className="bg-ink-card px-5 py-4">
          <span className="block font-mono text-[1.7rem] font-semibold tabular-nums leading-none">{stats.free}</span>
          <span className="mt-2 block text-xs uppercase tracking-wide text-parchment-dim">Freie Plätze</span>
        </div>
        <div className="bg-ink-card px-5 py-4">
          <span className="block font-mono text-[1.7rem] font-semibold tabular-nums leading-none text-warn">
            {stats.low}
          </span>
          <span className="mt-2 block text-xs uppercase tracking-wide text-parchment-dim">Fächer niedrig</span>
        </div>
        <div className="bg-ink-card px-5 py-4">
          <span className="block font-mono text-[1.7rem] font-semibold tabular-nums leading-none">
            {stats.capacity}
          </span>
          <span className="mt-2 block text-xs uppercase tracking-wide text-parchment-dim">Kapazität gesamt</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-ink-border bg-ink-card px-4 py-3 text-xs text-parchment-dim">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-wine" /> Rotwein
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-wine-white" /> Weißwein
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-wine-rose" /> Rosé
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-wine-sekt" /> Sekt
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-parchment-dim" /> Leer
        </span>
        <span className="ml-auto text-[0.76rem] text-parchment-dim">
          Ein Fach kann mehrere Sorten mischen. Jede Flasche einzeln per ↻ drehbar.
        </span>
      </div>

      {deleteError && <p className="text-sm text-warn">{deleteError}</p>}

      {cabinets.map((cabinet) => (
        <Card key={cabinet.id}>
          <CardHeader
            title={cabinet.name}
            subtitle={cabinet.temperatureC !== null ? `${cabinet.temperatureC}°C` : undefined}
            right={
              canManage ? (
                <button
                  type="button"
                  onClick={() => handleDeleteCabinet(cabinet.id, cabinet.name)}
                  disabled={pending}
                  className="text-xs text-parchment-dim hover:text-warn"
                >
                  Löschen
                </button>
              ) : undefined
            }
          />
          <div className="space-y-1">
            {Array.from({ length: RACK_COUNT }, (_, i) => i + 1).map((rackNumber) => (
              <WineRack
                key={rackNumber}
                rackNumber={rackNumber}
                slots={rackSlots(cabinet, rackNumber)}
                onSelectSlot={(slot) =>
                  setActive({ cabinetId: cabinet.id, cabinetName: cabinet.name, rackNumber, slot })
                }
              />
            ))}
          </div>
        </Card>
      ))}

      <WineSlotPanel active={active} wineItems={wineItems} onClose={() => setActive(null)} onMutated={handleMutated} />
    </div>
  );
}
