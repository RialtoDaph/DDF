// Training videos are now pasted in as a Google Drive share link rather than
// uploaded through the app (Supabase Free plan's 50 MB cap made in-browser
// upload/compression unreliable — see git history). A share link like
// https://drive.google.com/file/d/FILE_ID/view?usp=sharing doesn't play
// directly; it needs to be rewritten to the /preview form to embed.

const DRIVE_FILE_ID_RE = /(?:\/file\/d\/|[?&]id=)([a-zA-Z0-9_-]{10,})/;

export function isDriveUrl(url: string): boolean {
  return /(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/.test(new URL(url).hostname);
}

function extractDriveFileId(url: string): string | null {
  return url.match(DRIVE_FILE_ID_RE)?.[1] ?? null;
}

/** Rewrites a Drive share/view link to its embeddable /preview form. Returns null if no file id could be found. */
export function driveEmbedUrl(url: string): string | null {
  const id = extractDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

export function isValidVideoLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
