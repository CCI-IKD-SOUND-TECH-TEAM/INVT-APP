import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Refreshes the auth session and reports who (if anyone) is signed in.
 *
 * Returns the user id alongside the response because proxy.ts needs both: the
 * response carries the refreshed cookies, and the identity decides whether to
 * redirect. Resolving it twice would mean two round trips per request.
 */
export const createClient = async (
  request: NextRequest
): Promise<{ response: NextResponse; userId: string | null }> => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touching the session is what triggers the cookie refresh above. Without
  // this call the helper returns a response that never renews the auth cookies.
  //
  // getClaims() rather than getUser(): this runs on every non-static request,
  // and getUser() is a round trip to the Auth server each time. getClaims()
  // verifies the JWT signature locally via WebCrypto against a cached JWKS, so
  // the common case costs no network at all — and it still refreshes an
  // about-to-expire session first, which is what renews the cookies above.
  //
  // Local verification requires the project to use asymmetric JWT signing keys.
  // On the legacy HS256 shared secret this silently falls back to a server
  // round trip (correct, just not faster) — see Supabase Dashboard →
  // Settings → JWT Keys.
  const { data } = await supabase.auth.getClaims();

  return { response: supabaseResponse, userId: data?.claims.sub ?? null };
};

/**
 * Builds a redirect that preserves any refreshed auth cookies.
 *
 * NextResponse.redirect() starts with empty cookies, so returning one directly
 * would discard a token Supabase just rotated — the user would be silently
 * signed out on the next request. Copy them across.
 */
export function redirectPreservingSession(
  request: NextRequest,
  pathname: string,
  source: NextResponse
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const redirect = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
