import type { SupabaseClient } from "@supabase/supabase-js";
import { compressVideo, terminateCompressor } from "./videoCompress";

// Supabase's Free plan enforces a fixed 50 MB upload limit project-wide,
// regardless of the training-videos bucket's own (larger) limit.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// Trigger compression well below the hard cap: phone-recorded .mov clips
// are extremely high-bitrate for their length (a short demo can hit 40+ MB
// while under the 50 MB cap), so waiting until the cap is nearly hit leaves
// most everyday uploads uncompressed — bloating storage and load times for
// everyone else viewing the module.
const COMPRESS_THRESHOLD_BYTES = 8 * 1024 * 1024;

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

export type UploadPhase = "preparing" | "compressing" | "uploading";

/** Shared progress-label formatting for the prepare/compress/upload phases. */
export function uploadProgressLabel(phase: UploadPhase, ratio: number, uploadingLabel: string): string {
  if (phase === "preparing") return "Video wird vorbereitet… (kann beim ersten Mal etwas dauern)";
  if (phase === "compressing") return `Video wird komprimiert… ${Math.round(ratio * 100)}%`;
  return `${uploadingLabel} ${Math.round(ratio * 100)}%`;
}

export class UploadCancelledError extends Error {
  constructor() {
    super("Hochladen abgebrochen.");
    this.name = "UploadCancelledError";
  }
}

// ffmpeg.wasm's compression pass loads the ~32 MB wasm core plus the full
// source video into memory (twice over — once as the JS Uint8Array, once
// inside the wasm heap) before it can even start transcoding. Desktop
// browsers have enough headroom for that; phones and tablets — iOS Safari
// in particular — enforce a much tighter per-tab memory ceiling and simply
// kill the page when it's exceeded, with no catchable JS error. That silent
// kill is what "upload doesn't work on phone but works on laptop" actually
// is, so on these devices we skip the risky compression pass entirely.
function isMemoryConstrainedDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof deviceMemory === "number") return deviceMemory <= 4;
  // Safari (where this bites hardest) never exposes deviceMemory — fall
  // back to a UA check for phones/tablets.
  return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
}

// A JS-level setTimeout is not a reliable backstop on iOS Safari: the tab
// can be suspended (screen lock, switching to the native Photos picker,
// memory pressure) and its timers frozen along with it, so a stuck request
// can outlast any setTimeout-based deadline. xhr.timeout below is enforced
// by the browser's network stack instead of the JS event loop and is the
// real guard; this is only a fallback for phases (like ffmpeg compression)
// that don't go through XHR at all.
const PHASE_TIMEOUT_MS = 4 * 60 * 1000;
const XHR_TIMEOUT_MS = 4 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(onTimeoutMessage)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Direct upload to Supabase Storage via XHR rather than the supabase-js
 * client, for two things the wrapped fetch client can't give us:
 * - xhr.upload.onprogress for a real byte-level percentage, so a slow
 *   upload is visibly *moving* instead of looking identical to a hang.
 * - xhr.abort() for a genuine, immediate cancel, and xhr.timeout as a
 *   network-stack-enforced deadline (see PHASE_TIMEOUT_MS comment).
 * Mirrors the multipart body storage-js itself sends (FormData with a
 * cacheControl field and the file under an empty key) so the server sees
 * an identical request.
 */
function uploadWithProgress(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: Blob,
  onProgress: (ratio: number) => void,
  signal: AbortSignal,
): Promise<{ error?: string }> {
  return new Promise((resolve) => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        resolve({ error: "Sitzung abgelaufen. Bitte Seite neu laden und erneut anmelden." });
        return;
      }
      if (signal.aborted) {
        resolve({ error: "cancelled" });
        return;
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.timeout = XHR_TIMEOUT_MS;

      const onAbort = () => xhr.abort();
      signal.addEventListener("abort", onAbort);
      const cleanup = () => signal.removeEventListener("abort", onAbort);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        cleanup();
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({});
          return;
        }
        let message = `Hochladen fehlgeschlagen (Status ${xhr.status}).`;
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string };
          if (body?.message) message = body.message;
        } catch {
          // Non-JSON error body — fall back to the status-code message above.
        }
        resolve({ error: message });
      };
      xhr.onerror = () => {
        cleanup();
        resolve({ error: "Netzwerkfehler beim Hochladen. Bitte Verbindung prüfen und erneut versuchen." });
      };
      xhr.ontimeout = () => {
        cleanup();
        resolve({
          error: "Zeitüberschreitung beim Hochladen. Bitte besseres WLAN/Empfang versuchen oder erneut probieren.",
        });
      };
      xhr.onabort = () => {
        cleanup();
        resolve({ error: "cancelled" });
      };

      xhr.send(form);
    })();
  });
}

/**
 * Uploads a training video straight from the browser to Supabase Storage,
 * bypassing the server entirely. Videos over the 50 MB cap are compressed
 * in-browser first (480p/H.264); if that still isn't enough, the caller
 * gets a clear error instead of a silently-rejected upload. `signal` lets
 * the caller offer a real cancel button — needed because on iOS Safari a
 * backgrounded tab can suspend JS timers, so a timeout alone isn't always
 * enough to get the user unstuck.
 */
export async function uploadTrainingVideo(
  supabase: SupabaseClient,
  moduleId: string,
  video: File,
  onProgress?: (phase: UploadPhase, ratio: number) => void,
  signal?: AbortSignal,
): Promise<{ path?: string; error?: string }> {
  if (video.size > MAX_SOURCE_BYTES) {
    return { error: videoTooLargeForCompressionMessage(video.size) };
  }

  const abortSignal = signal ?? new AbortController().signal;

  try {
    return await runUpload(supabase, moduleId, video, onProgress, abortSignal);
  } catch (err) {
    if (err instanceof UploadCancelledError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Unbekannter Fehler beim Hochladen." };
  }
}

async function runUpload(
  supabase: SupabaseClient,
  moduleId: string,
  video: File,
  onProgress: ((phase: UploadPhase, ratio: number) => void) | undefined,
  signal: AbortSignal,
): Promise<{ path?: string; error?: string }> {
  let toUpload: Blob = video;
  const sourceName = video.name;

  if (signal.aborted) throw new UploadCancelledError();

  if (video.size > COMPRESS_THRESHOLD_BYTES) {
    const constrained = isMemoryConstrainedDevice();

    if (constrained && video.size <= MAX_VIDEO_BYTES) {
      // Fits under the hard cap as-is — skip the wasm compression pass
      // rather than risk this device's tab getting killed for no benefit.
    } else if (constrained) {
      return {
        error:
          `Video ist zu groß (${(video.size / (1024 * 1024)).toFixed(0)} MB) für automatische Komprimierung auf diesem Gerät. ` +
          "Bitte Video vorher kürzen/verkleinern (z. B. in der Kamera-App) oder von einem Laptop/PC hochladen.",
      };
    } else {
      onProgress?.("preparing", 0);
      try {
        toUpload = await withTimeout(
          compressVideo(video, (ratio) => onProgress?.("compressing", ratio), signal),
          PHASE_TIMEOUT_MS,
          "Komprimierung dauert ungewöhnlich lange (Verbindung zu langsam oder Video zu groß). Bitte erneut versuchen oder ein kürzeres Video wählen.",
        );
      } catch (err) {
        if (signal.aborted || err instanceof UploadCancelledError) throw new UploadCancelledError();
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
  }

  if (signal.aborted) throw new UploadCancelledError();

  onProgress?.("uploading", 0);
  const path = `${moduleId}/${slugify(sourceName || "video")}-${Date.now()}`;
  const { error } = await uploadWithProgress(
    supabase,
    "training-videos",
    path,
    toUpload,
    (ratio) => onProgress?.("uploading", ratio),
    signal,
  );

  if (error === "cancelled") throw new UploadCancelledError();
  if (error) {
    const tooLarge = /payload too large|exceeded the maximum allowed size|too large|entitytoolarge/i.test(error);
    return { error: tooLarge ? videoTooLargeMessage(toUpload.size) : error };
  }

  onProgress?.("uploading", 1);
  return { path };
}

/** Best-effort teardown for a cancelled upload — frees the ffmpeg worker if one was running. */
export function cancelTrainingVideoUpload() {
  terminateCompressor();
}
