"use client";

import { useState, useTransition } from "react";
import { assignBottle, removeBottle, attachLabelPhoto, removeLabelPhoto } from "./actions";
import { WINE_TYPE_LABEL, type SlotData, type WineItem } from "./lib";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { CameraCapture, type CapturedPhoto } from "@/components/camera/CameraCapture";
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
  canManage,
  onClose,
  onMutated,
}: {
  active: ActiveSlot | null;
  wineItems: WineItem[];
  canManage: boolean;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [photoPending, startPhotoTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedItemId, setPickedItemId] = useState("");
  // Local override so the panel reflects an assign/remove immediately,
  // without waiting on the background router.refresh() that resyncs the
  // rest of the page.
  const [displayItem, setDisplayItem] = useState<SlotData["item"]>(null);
  const [prevSlotId, setPrevSlotId] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);

  // Reset the panel's local state whenever it switches to a different slot
  // (or closes) — a render-time adjustment rather than an effect, so the
  // very first paint for a newly opened slot is already correct.
  const currentSlotId = active?.slot.id ?? null;
  if (currentSlotId !== prevSlotId) {
    setPrevSlotId(currentSlotId);
    setError(null);
    setDisplayItem(active?.slot.item ?? null);
    setPickedItemId("");
    setCaptureOpen(false);
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

  // The photo shows immediately via the capture's local blob preview; a
  // failed upload rolls the previous labelPhotoUrl back in.
  function handleCapturePhoto(p: CapturedPhoto) {
    if (!displayItem) return;
    const item = displayItem;
    const previousUrl = item.labelPhotoUrl;
    setCaptureOpen(false);
    setError(null);
    setDisplayItem({ ...item, labelPhotoUrl: p.previewUrl });
    startPhotoTransition(async () => {
      const fd = new FormData();
      fd.set("item_id", item.id);
      fd.set("photo", p.file);
      const res = await attachLabelPhoto(fd);
      if (res?.error) {
        setError(res.error);
        setDisplayItem((cur) => (cur ? { ...cur, labelPhotoUrl: previousUrl } : cur));
        return;
      }
      onMutated();
    });
  }

  function handleRemovePhoto() {
    if (!displayItem) return;
    const item = displayItem;
    const previousUrl = item.labelPhotoUrl;
    setError(null);
    setDisplayItem({ ...item, labelPhotoUrl: null });
    startPhotoTransition(async () => {
      const res = await removeLabelPhoto(item.id);
      if (res?.error) {
        setError(res.error);
        setDisplayItem((cur) => (cur ? { ...cur, labelPhotoUrl: previousUrl } : cur));
        return;
      }
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

                  {displayItem.labelPhotoUrl ? (
                    <div className="mx-auto mb-3 aspect-[3/4] w-[132px] overflow-hidden rounded-lg border-[1.5px] border-ink-border bg-ink-raised">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayItem.labelPhotoUrl}
                        alt={`Etikett ${displayItem.name}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mx-auto mb-3 flex aspect-[3/4] w-[132px] items-center justify-center rounded-lg border-[1.5px] border-dashed border-ink-border bg-ink-raised p-3 text-center">
                      <span className="text-[0.7rem] leading-snug text-parchment-dim">
                        Kein Etikett-Foto
                        <br />
                        hinterlegt
                      </span>
                    </div>
                  )}

                  {canManage && (
                    <div className="mb-5">
                      {captureOpen ? (
                        <div className="space-y-2">
                          <CameraCapture
                            onCapture={handleCapturePhoto}
                            value={null}
                            label="Etikett fotografieren"
                            aspect="portrait"
                          />
                          <button
                            type="button"
                            onClick={() => setCaptureOpen(false)}
                            className="w-full text-center text-xs text-parchment-dim hover:text-parchment"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            disabled={photoPending}
                            onClick={() => setCaptureOpen(true)}
                          >
                            {displayItem.labelPhotoUrl ? "Foto ersetzen" : "+ Etikett-Foto"}
                          </Button>
                          {displayItem.labelPhotoUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={photoPending}
                              onClick={handleRemovePhoto}
                            >
                              Entfernen
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

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
