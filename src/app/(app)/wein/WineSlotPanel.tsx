"use client";

import { useState, useTransition } from "react";
import { assignBottle, removeBottle } from "./actions";
import { WINE_TYPE_LABEL, type SlotData, type WineItem } from "./lib";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ActiveSlot {
  cabinetId: string;
  cabinetName: string;
  rackNumber: number;
  slot: SlotData;
}

export function WineSlotPanel({
  active,
  wineItems,
  onClose,
  onMutated,
}: {
  active: ActiveSlot | null;
  wineItems: WineItem[];
  onClose: () => void;
  onMutated: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedItemId, setPickedItemId] = useState("");
  // Local override so the panel reflects an assign/remove immediately,
  // without waiting on the background router.refresh() that resyncs the
  // rest of the page.
  const [displayItem, setDisplayItem] = useState<SlotData["item"]>(null);
  const [prevSlotId, setPrevSlotId] = useState<string | null>(null);

  // Reset the panel's local state whenever it switches to a different slot
  // (or closes) — a render-time adjustment rather than an effect, so the
  // very first paint for a newly opened slot is already correct.
  const currentSlotId = active?.slot.id ?? null;
  if (currentSlotId !== prevSlotId) {
    setPrevSlotId(currentSlotId);
    setError(null);
    setDisplayItem(active?.slot.item ?? null);
    setPickedItemId("");
  }

  const open = !!active;

  function handleAssign() {
    if (!active || !pickedItemId) return;
    setError(null);
    const item = wineItems.find((w) => w.id === pickedItemId);
    if (!item) return;
    startTransition(async () => {
      const res = await assignBottle(active.slot.id, pickedItemId, {
        cabinetName: active.cabinetName,
        rackNumber: active.rackNumber,
        slotNumber: active.slot.slotNumber,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setDisplayItem(item);
      onMutated();
    });
  }

  function handleRemove() {
    if (!active) return;
    setError(null);
    startTransition(async () => {
      const res = await removeBottle(active.slot.id, {
        cabinetName: active.cabinetName,
        rackNumber: active.rackNumber,
        slotNumber: active.slot.slotNumber,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setDisplayItem(null);
      onMutated();
    });
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-20 bg-black/55 backdrop-blur-[2px] transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-30 flex h-full w-full max-w-[380px] flex-col border-l border-ink-border bg-ink-card shadow-[-24px_0_48px_-24px_rgba(0,0,0,0.45)] transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        {active && (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-ink-border p-5">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-wide text-parchment-dim">
                  {active.cabinetName} · Fach {active.rackNumber} · Flasche {active.slot.slotNumber}
                </p>
                <p className="font-serif text-xl font-semibold text-parchment">
                  {displayItem ? displayItem.name : "Leerer Platz"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Schließen"
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-ink-border text-parchment-dim hover:border-wine-soft hover:text-parchment"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!displayItem ? (
                <div>
                  <p className="mb-4 text-sm text-parchment-dim">Noch keine Flasche zugewiesen.</p>
                  {wineItems.length === 0 ? (
                    <p className="text-xs text-parchment-dim">
                      Noch keine Weine im Inventar (Kategorie „wine“) angelegt.
                    </p>
                  ) : (
                    <>
                      <Select
                        value={pickedItemId}
                        onChange={(e) => setPickedItemId(e.target.value)}
                        className="mb-3"
                        aria-label="Wein auswählen"
                      >
                        <option value="">— Wein wählen —</option>
                        {wineItems.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.wineType ? `(${WINE_TYPE_LABEL[w.wineType]})` : ""} — {w.currentStock} {w.unit} auf Lager
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        className="w-full"
                        disabled={!pickedItemId || pending}
                        onClick={handleAssign}
                      >
                        {pending ? "…" : "+ Wein hier einlagern"}
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <p className="mb-5 inline-flex items-center gap-2 text-[0.78rem] text-parchment-dim">
                    {displayItem.wineType && (
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          displayItem.wineType === "rot" && "bg-wine",
                          displayItem.wineType === "weiss" && "bg-wine-white",
                          displayItem.wineType === "rose" && "bg-wine-rose",
                          displayItem.wineType === "sekt" && "bg-wine-sekt",
                        )}
                      />
                    )}
                    {displayItem.wineType ? WINE_TYPE_LABEL[displayItem.wineType] : "Typ nicht gesetzt"} ·{" "}
                    {displayItem.currentStock} {displayItem.unit} im Bestand gesamt
                  </p>

                  <div className="mx-auto mb-3 flex aspect-[3/4] w-[132px] items-center justify-center rounded-lg border-[1.5px] border-dashed border-ink-border bg-ink-raised p-3 text-center">
                    <span className="text-[0.7rem] leading-snug text-parchment-dim">
                      Kein Etikett-Foto
                      <br />
                      hinterlegt
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="mb-5 w-full cursor-not-allowed rounded-md border border-dashed border-ink-border py-2.5 text-[0.85rem] font-semibold text-parchment-dim"
                  >
                    Etikett-Foto hinzufügen — bald verfügbar
                  </button>

                  <Button type="button" variant="ghost" className="w-full" disabled={pending} onClick={handleRemove}>
                    {pending ? "…" : "↑ Ausgang — Flasche entnehmen"}
                  </Button>
                </div>
              )}

              {error && <p className="mt-3 text-sm text-warn">{error}</p>}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
