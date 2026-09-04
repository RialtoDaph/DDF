import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies a Supabase email OTP (password recovery, invite, magic link, …)
 * by token_hash rather than the PKCE `code` param the client SDK generates
 * by default. The PKCE code exchange only works in the same browser that
 * originated the request (it matches a code_verifier from that browser's own
 * storage) — a recovery link opened from an email app on another device or
 * browser fails with "invalid or expired" even though the link itself is
 * fine. token_hash verification happens entirely against Supabase's API, so
 * it works regardless of where the link is opened.
 *
 * Requires the Supabase Dashboard's email templates to link here with
 * token_hash and type, e.g. for "Reset Password":
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/reset-password?error=invalid_link`);
}
