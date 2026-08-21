"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { saveItemResult, addChecklistItemPhoto, deleteChecklistItemPhoto } from "./actions";
import { CameraCapture, type CapturedPhoto } from "@/components/camera/CameraCapture";
import { cn } from "@/lib/utils";
import type { ChecklistTemplateItem, ChecklistType } from "@/lib/database.types";

export interface ItemPhoto {
  id: string;
  url: string;
  takenAt: string;
}

export function ItemRow({
  submissionId,
  type,
  item,
  initialChecked,
  initialPhotos,
  readOnly,
}: {
  submissionId: string;
  type: ChecklistType;
  item: ChecklistTemplateItem;
  initialChecked: boolean;
  initialPhotos: ItemPhoto[];
  readOnly: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [photos, setPhotos] = useState<ItemPhoto[]>(initialPhotos);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const satisfied = checked && (!item.requires_photo || photos.length > 0);

  // The checkbox updates optimistically before the server confirms it (so
  // tapping feels instant); without a rollback a failed save (RLS reject,
  // network blip) left the row showing checked forever with only a small
  // warning text underneath — easy to miss, indistinguishable from a real
  // save.
  function handleToggle() {
    if (readOnly || item.requires_photo) return;
    const prevChecked = checked;
    const next = !checked;
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("submission_id", submissionId);
      fd.set("type", type);
      fd.set("item_text", item.text);
      fd.set("checked", String(next));
      const res = await saveItemResult(fd);
      if (res?.error) {
        setError(res.error);
        setChecked(prevChecked);
      }
    });
  }

  // Each capture is appended, not replaced — a Punkt can carry any number of
  // photos (e.g. "before"/"after" for a cleaning task). The new photo shows
  // immediately via its local blob preview while the upload runs in the
  // background; a failed upload rolls the optimistic entry back out.
  function handleCapture(p: CapturedPhoto) {
    setCaptureOpen(false);
    setError(null);
    setChecked(true);
    const tempId = `pending-${Date.now()}`;
    setPhotos((prev) => [...prev, { id: tempId, url: p.previewUrl, takenAt: p.takenAt }]);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("submission_id", submissionId);
      fd.set("type", type);
      fd.set("item_text", item.text);
      fd.set("photo", p.file);
      fd.set("taken_at", p.takenAt);
      const res = await addChecklistItemPhoto(fd);
      if (res?.error || !res?.photoId) {
        setError(res?.error ?? "Foto konnte nicht gespeichert werden.");
        setPhotos((prev) => prev.filter((ph) => ph.id !== tempId));
        return;
      }
      const photoId = res.photoId;
      setPhotos((prev) => prev.map((ph) => (ph.id === tempId ? { ...ph, id: photoId } : ph)));
    });
  }

  function handleRemovePhoto(photoId: string) {
    setError(null);
    const removed = photos.find((p) => p.id === photoId);
    const wasLastPhoto = photos.length <= 1;
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    if (wasLastPhoto) setChecked(false);
    startTransition(async () => {
      const res = await deleteChecklistItemPhoto(photoId, submissionId, type);
      if (res?.error) {
        // Roll back — otherwise a failed delete still visually removes the
        // photo (and un-checks the item if it was the last one), which
        // looks like the delete worked when the row is actually unchanged.
        setError(res.error);
        if (removed) setPhotos((prev) => [...prev, removed]);
        if (wasLastPhoto) setChecked(true);
      }
    });
  }

  return (
    <li className={cn("py-3", item.requires_photo && "border-l-2 pl-3 -ml-3 border-wine/30")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={readOnly || pending || item.requires_photo}
          aria-label={checked ? "Als offen markieren" : "Als erledigt markieren"}
          className={cn(
            "mt-0.5 h-[18px] w-[18px] shrink-0 rounded-[5px] border-[1.5px] flex items-center justify-center transition-colors",
            satisfied ? "bg-done border-done" : "border-ink-border",
            readOnly && "opacity-60",
          )}
        >
          {satisfied && <span className="text-ink text-[10px]">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm", satisfied ? "text-parchment-dim line-through" : "text-parchment")}>
            {item.text}
          </p>

          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={item.text}
                    className="h-16 w-16 rounded-md border border-ink-border object-cover"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(p.id)}
                      aria-label="Foto entfernen"
                      className="absolute -top-1.5 -right-1.5 bg-ink/80 text-parchment rounded-full p-0.5 hover:bg-warn-soft hover:text-warn"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!readOnly && captureOpen && (
            <div className="mt-2 max-w-xs">
              <CameraCapture
                onCapture={handleCapture}
                value={null}
                label={photos.length > 0 ? "Weiteres Foto aufnehmen" : "Foto aufnehmen"}
              />
            </div>
          )}

          {error && <p className="text-xs text-warn mt-1">{error}</p>}
        </div>

        {item.requires_photo && (
          <button
            type="button"
            onClick={() => !readOnly && setCaptureOpen((o) => !o)}
            disabled={readOnly}
            className={cn(
              "shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded font-mono text-[9.5px] px-1.5 py-0.5 border",
              photos.length > 0
                ? "border-done text-done"
                : captureOpen
                  ? "border-wine text-wine"
                  : "border-ink-border text-parchment-dim",
            )}
          >
            📷 FOTO{photos.length > 0 ? ` (${photos.length})` : ""}
          </button>
        )}
      </div>
    </li>
  );
}
