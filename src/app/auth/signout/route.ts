import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Clears the session and returns to the login page. Lives in a Route Handler
 * because that's the only place cookies can actually be written during a
 * redirect — `requireProfile()` sends deactivated accounts here.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  const reason = request.nextUrl.searchParams.get("reason");
  url.search = reason === "deactivated" ? "?deactivated=1" : "";

  return NextResponse.redirect(url);
}
