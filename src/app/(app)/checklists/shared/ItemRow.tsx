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
    if (readOnly) return;
    const next = !checked;
    setChecked(next);
    persist(next);
  }

  function handleCapture(p: CapturedPhoto) {
    setPhoto(p);
    setChecked(true);
    persist(true, p);
  }

  return (
    <li className={cn("py-3", item.requires_photo && "border-l-2 pl-3 -ml-3 border-wine/30")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={readOnly || pending}
          aria-label={checked ? "Als offen markieren" : "Als erledigt markieren"}
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 rounded border flex items-center justify-center transition-colors",
            satisfied ? "bg-done border-done" : "border-ink-border",
            readOnly && "opacity-60",
          )}
        >
          {satisfied && <span className="text-ink text-xs">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm", satisfied ? "text-parchment-dim line-through" : "text-parchment")}>
            {item.text}
            {item.requires_photo && <span className="text-wine ml-1">📷</span>}
          </p>
          {item.requires_photo && !readOnly && (
            <div className="mt-2 max-w-xs">
              <CameraCapture onCapture={handleCapture} onClear={() => setPhoto(null)} value={photo} />
            </div>
          )}
          {item.requires_photo && readOnly && photo && (
            <div className="mt-2 max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt={item.text} className="rounded-md border border-ink-border" />
            </div>
          )}
          {error && <p className="text-xs text-warn mt-1">{error}</p>}
        </div>
      </div>
    </li>
  );
}
