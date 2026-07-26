import { type NextRequest } from "next/server";
import {
  createClient,
  redirectPreservingSession,
} from "@/utils/supabase/middleware";

/**
 * Refreshes the Supabase session on every request and gates the app.
 *
 * Next 16 renamed this convention from `middleware` to `proxy`; the exported
 * function must be named `proxy` for the framework to pick it up.
 */

/**
 * Reachable without a session.
 *
 * - /login is the sign-in surface itself
 * - /auth/confirm is the magic-link landing; it has no session *yet*, since
 *   exchanging the token is precisely what creates one
 * - /api/cron/* authenticates with CRON_SECRET
 */
const PUBLIC_PATHS = ["/login", "/auth/confirm", "/api/cron"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { response, user } = await createClient(request);
  const { pathname } = request.nextUrl;

  // Signed out, asking for a protected route -> sign in first.
  if (!user && !isPublic(pathname)) {
    return redirectPreservingSession(request, "/login", response);
  }

  // Signed in, sitting on /login -> nothing to do here.
  if (user && pathname === "/login") {
    return redirectPreservingSession(request, "/dashboard", response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build output)
     * - favicon.ico
     * - image/font files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
