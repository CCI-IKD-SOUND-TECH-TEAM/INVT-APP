import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/**
 * Magic-link landing. Exchanges the `token_hash` from the email for a session,
 * then forwards on.
 *
 * The code path (typing six digits) goes through verifyCode in
 * app/actions/auth.ts instead — same verifyOtp call, different credential form.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    // Expired or already-used link — both land the user back on /login with a
    // message rather than a raw error page.
    return NextResponse.redirect(new URL("/login?error=expired_link", request.url));
  }

  // Stamp the login. Best-effort: a failed write here must not block sign-in.
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data.user.id);
  }

  // Only accept relative paths — an absolute `next` would make this an open
  // redirect that forwards an authenticated user to an attacker's domain.
  const destination = next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";

  return NextResponse.redirect(new URL(destination, request.url));
}
