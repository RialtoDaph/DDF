import type { SupabaseClient } from "@supabase/supabase-js";
import { compressVideo } from "./videoCompress";

// Supabase's Free plan enforces a fixed 50 MB upload limit project-wide,
// regardless of the training-videos bucket's own (larger) limit.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// Above this, don't even attempt in-browser compression — transcoding a
// multi-GB file with a single-threaded wasm ffmpeg would take forever (or
// run the tab out of memory) on a phone.
export const MAX_SOURCE_BYTES = 2 * 1024 * 1024 * 1024;

export function videoTooLargeForCompressionMessage(bytes: number) {
  return `Video ist zu groß (${(bytes / (1024 * 1024)).toFixed(0)} MB) für automatische Komprimierung. Bitte vorher kürzen.`;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function videoTooLargeMessage(bytes: number) {
  return `Video ist zu groß (${(bytes / (1024 * 1024)).toFixed(0)} MB). Maximal 50 MB — bitte komprimieren oder kürzen.`;
}

export type UploadPhase = "compressing" | "uploading";

/** Shared progress-label formatting for the compress/upload phases. */
export function uploadProgressLabel(phase: UploadPhase, ratio: number, uploadingLabel: string): string {
  const pct = Math.round(ratio * 100);
  return phase === "compressing" ? `Video wird komprimiert… ${pct}%` : uploadingLabel;
}

/**
 * Uploads a training video straight from the browser to Supabase Storage,
 * bypassing the server entirely. Videos over the 50 MB cap are compressed
 * in-browser first (480p/H.264); if that still isn't enough, the caller
 * gets a clear error instead of a silently-rejected upload.
 */
export async function uploadTrainingVideo(
  supabase: SupabaseClient,
  moduleId: string,
  video: File,
  onProgress?: (phase: UploadPhase, ratio: number) => void,
): Promise<{ path?: string; error?: string }> {
  let toUpload = video;

  if (video.size > MAX_SOURCE_BYTES) {
    return { error: videoTooLargeForCompressionMessage(video.size) };
  }

  if (video.size > MAX_VIDEO_BYTES) {
    try {
      toUpload = await compressVideo(video, (ratio) => onProgress?.("compressing", ratio));
    } catch {
      return {
        error: "Komprimierung im Browser fehlgeschlagen. Bitte Video manuell verkleinern oder ein kürzeres Video wählen.",
      };
    }

    if (toUpload.size > MAX_VIDEO_BYTES) {
      return {
        error: `Video ist auch nach automatischer Komprimierung noch zu groß (${(toUpload.size / (1024 * 1024)).toFixed(0)} MB). Bitte ein kürzeres Video wählen.`,
      };
    }
  }

  onProgress?.("uploading", 0);
  const path = `${moduleId}/${slugify(toUpload.name || "video")}-${Date.now()}`;
  const { error } = await supabase.storage
    .from("training-videos")
    .upload(path, toUpload, { contentType: toUpload.type || "video/mp4" });

  if (error) {
    const tooLarge = /payload too large|exceeded the maximum allowed size|too large|entitytoolarge/i.test(
      error.message,
    );
    return { error: tooLarge ? videoTooLargeMessage(toUpload.size) : error.message };
  }

  onProgress?.("uploading", 1);
  return { path };
}
