import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase's Free plan enforces a fixed 50 MB upload limit project-wide,
// regardless of the training-videos bucket's own (larger) limit.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

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

/** Uploads a training video straight from the browser to Supabase Storage, bypassing the server entirely. */
export async function uploadTrainingVideo(
  supabase: SupabaseClient,
  moduleId: string,
  video: File,
): Promise<{ path?: string; error?: string }> {
  if (video.size > MAX_VIDEO_BYTES) {
    return { error: videoTooLargeMessage(video.size) };
  }

  const path = `${moduleId}/${slugify(video.name || "video")}-${Date.now()}`;
  const { error } = await supabase.storage
    .from("training-videos")
    .upload(path, video, { contentType: video.type || "video/mp4" });

  if (error) {
    const tooLarge = /payload too large|exceeded the maximum allowed size|too large|entitytoolarge/i.test(
      error.message,
    );
    return { error: tooLarge ? videoTooLargeMessage(video.size) : error.message };
  }

  return { path };
}
