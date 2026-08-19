"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// Core files are served from /public/ffmpeg (copied from @ffmpeg/core at
// install time) rather than a CDN, so compression works without any
// external dependency at runtime. This is the single-threaded core on
// purpose — the multi-threaded one needs cross-origin-isolation headers
// (COOP/COEP) and has spotty support on Safari/iOS, which is where most
// staff will actually be uploading from.
let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (!loadPromise) {
    loadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
        // Point at our own copy instead of letting the library resolve
        // "./worker.js" relative to its own module — that resolution
        // isn't reliable once the package is bundled by Next.js.
        classWorkerURL: "/ffmpeg/worker.js",
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  return loadPromise;
}

/**
 * Hard-kills the compressor worker (used for a user-initiated cancel — there
 * is no clean "stop" for an in-flight exec()). The next compressVideo() call
 * transparently spins up a fresh instance.
 */
export function terminateCompressor() {
  ffmpegInstance?.terminate();
  ffmpegInstance = null;
  loadPromise = null;
}

/** Transcodes a video down to 480p/CRF 30 H.264 to shrink it for upload. */
export async function compressVideo(
  file: File,
  onProgress?: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<File> {
  const ffmpeg = await getFFmpeg();

  if (signal?.aborted) throw new Error("cancelled");
  const onAbort = () => terminateCompressor();
  signal?.addEventListener("abort", onAbort);

  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", progressHandler);

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const inputName = `input.${ext}`;
  const outputName = "output.mp4";

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      "scale=-2:480",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "30",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const blob = new Blob([new Uint8Array(bytes)], { type: "video/mp4" });
    const compressedName = `${file.name.replace(/\.[^./]+$/, "")}-compressed.mp4`;
    return new File([blob], compressedName, { type: "video/mp4" });
  } finally {
    signal?.removeEventListener("abort", onAbort);
    // A cancel mid-exec() tears the instance down via terminateCompressor(),
    // so these calls would throw against the now-dead worker — cleanup
    // failing doesn't matter once the operation itself has been abandoned.
    try {
      ffmpeg.off("progress", progressHandler);
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});
    } catch {
      // Ignored — see comment above.
    }
  }
}
