import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Refreshes the auth session and reports who (if anyone) is signed in.
 *
 * Returns the user alongside the response because proxy.ts needs both: the
 * response carries the refreshed cookies, and the user decides whether to
 * redirect. Fetching the user twice would mean two round trips per request.
 */
export const createClient = async (
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> => {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
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
