"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StampBadge } from "@/components/ui/StampBadge";
import { cn } from "@/lib/utils";

export interface CapturedPhoto {
  file: File;
  takenAt: string;
  previewUrl: string;
}

/**
 * Live-camera-only capture. Never lets the user pick from the gallery:
 * primary path is getUserMedia with an in-page shutter; if that is
 * unavailable (older browser, insecure context) we fall back to
 * <input capture="environment"> which mobile browsers open directly into
 * the camera app, never the photo library. Either way the frame is drawn to
 * a canvas with a burned-in timestamp before it becomes the final photo.
 */
export function CameraCapture({
  onCapture,
  onClear,
  value,
  label = "Foto aufnehmen",
}: {
  onCapture: (photo: CapturedPhoto) => void;
  onClear?: () => void;
  value?: CapturedPhoto | { previewUrl: string; takenAt: string } | null;
  label?: string;
}) {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  useEffect(() => stopStream, [stopStream]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      // No camera API / permission denied — fall back to the capture-only
      // file input, which still opens the device camera on mobile.
      fallbackInputRef.current?.click();
    }
  }

  function stampCanvas(source: CanvasImageSource, width: number, height: number, takenAt: Date) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, width, height);

    const label = takenAt.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const pad = Math.round(height * 0.02);
    ctx.font = `${Math.max(14, Math.round(height * 0.032))}px monospace`;
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(20, 17, 14, 0.72)";
    ctx.fillRect(width - textWidth - pad * 2.4, height - pad * 3, textWidth + pad * 2.4, pad * 3);
    ctx.fillStyle = "#EDE3D0";
    ctx.textBaseline = "middle";
    ctx.fillText(label, width - textWidth - pad * 1.2, height - pad * 1.5);
    return canvas;
  }

  function finishCapture(canvas: HTMLCanvasElement, takenAt: Date) {
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${takenAt.getTime()}.jpg`, { type: "image/jpeg" });
        onCapture({ file, takenAt: takenAt.toISOString(), previewUrl: URL.createObjectURL(blob) });
      },
      "image/jpeg",
      0.85,
    );
  }

  function shoot() {
    const video = videoRef.current;
    if (!video) return;
    const takenAt = new Date();
    const canvas = stampCanvas(video, video.videoWidth, video.videoHeight, takenAt);
    stopStream();
    if (canvas) finishCapture(canvas, takenAt);
  }

  function handleFallbackFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const takenAt = new Date();
    const img = new Image();
    img.onload = () => {
      const canvas = stampCanvas(img, img.naturalWidth, img.naturalHeight, takenAt);
      if (canvas) finishCapture(canvas, takenAt);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-md overflow-hidden border border-ink-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.previewUrl} alt="Aufgenommenes Foto" className="w-full aspect-video object-cover" />
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Foto entfernen"
              className="absolute top-2 right-2 bg-ink/80 text-parchment rounded-full p-1.5 hover:bg-warn-soft hover:text-warn"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <StampBadge>
          Aufgenommen {new Date(value.takenAt).toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
        </StampBadge>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFallbackFile}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {streaming ? (
        <div className="space-y-2">
          <div className="relative rounded-md overflow-hidden border border-ink-border bg-black">
            <video ref={videoRef} playsInline muted className="w-full aspect-video object-cover" />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={shoot} className="flex-1">
              <Camera size={16} />
              Auslösen
            </Button>
            <Button type="button" variant="secondary" onClick={stopStream}>
              <RotateCcw size={16} />
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={startCamera} className={cn("w-full")}>
          <Camera size={16} />
          {label}
        </Button>
      )}
      {error && <p className="text-xs text-warn">{error}</p>}
    </div>
  );
}
