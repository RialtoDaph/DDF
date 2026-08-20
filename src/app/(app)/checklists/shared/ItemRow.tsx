"use client";

import { useState, useTransition } from "react";
import { saveItemResult } from "./actions";
import { CameraCapture, type CapturedPhoto } from "@/components/camera/CameraCapture";
import { cn } from "@/lib/utils";
import type { ChecklistTemplateItem, ChecklistType } from "@/lib/database.types";

export function ItemRow({
  submissionId,
  type,
  item,
  initialChecked,
  initialPhotoUrl,
  initialTakenAt,
  readOnly,
}: {
  submissionId: string;
  type: ChecklistType;
  item: ChecklistTemplateItem;
  initialChecked: boolean;
  initialPhotoUrl: string | null;
  initialTakenAt: string | null;
  readOnly: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [photo, setPhoto] = useState<CapturedPhoto | { previewUrl: string; takenAt: string } | null>(
    initialPhotoUrl && initialTakenAt ? { previewUrl: initialPhotoUrl, takenAt: initialTakenAt } : null,
  );
  const [captureOpen, setCaptureOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const satisfied = checked && (!item.requires_photo || !!photo);

  function persist(nextChecked: boolean, capturedPhoto?: CapturedPhoto) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("submission_id", submissionId);
      fd.set("type", type);
      fd.set("item_text", item.text);
      fd.set("checked", String(nextChecked));
      if (capturedPhoto) {
        fd.set("photo", capturedPhoto.file);
        fd.set("taken_at", capturedPhoto.takenAt);
      }
      const res = await saveItemResult(fd);
      if (res?.error) setError(res.error);
    });
  }

  function handleToggle() {
    if (readOnly || item.requires_photo) return;
    const next = !checked;
    setChecked(next);
    persist(next);
  }

  function handleCapture(p: CapturedPhoto) {
    setPhoto(p);
    setChecked(true);
    setCaptureOpen(false);
    persist(true, p);
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

          {photo && (
            <div className="mt-2 max-w-xs">
              {readOnly ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.previewUrl} alt={item.text} className="rounded-md border border-ink-border" />
              ) : (
                <CameraCapture onCapture={handleCapture} onClear={() => setPhoto(null)} value={photo} />
              )}
            </div>
          )}

          {!photo && !readOnly && captureOpen && (
            <div className="mt-2 max-w-xs">
              <CameraCapture onCapture={handleCapture} value={null} />
            </div>
          )}

          {error && <p className="text-xs text-warn mt-1">{error}</p>}
        </div>

        {item.requires_photo && (
          <button
            type="button"
            onClick={() => !readOnly && !photo && setCaptureOpen((o) => !o)}
            disabled={readOnly || !!photo}
            className={cn(
              "shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded font-mono text-[9.5px] px-1.5 py-0.5 border",
              photo
                ? "border-done text-done"
                : captureOpen
                  ? "border-wine text-wine"
                  : "border-ink-border text-parchment-dim",
            )}
          >
            📷 FOTO
          </button>
        )}
      </div>
    </li>
  );
}
