import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // ffmpeg/ is excluded too: it's the self-hosted ffmpeg.wasm core/worker
  // used to compress training videos in-browser, and running it through
  // the Supabase session refresh on every request just adds latency to an
  // already-large (~30 MB) asset.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ffmpeg/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
