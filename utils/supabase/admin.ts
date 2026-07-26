import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Elevated server-side client. Bypasses RLS entirely — only for operations that
 * genuinely need it: inviteUserByEmail, the pre-mail profile lookup in
 * requestSignIn, and the low-stock cron (which runs with no user session).
 *
 * Uses a NEW-FORMAT secret key (`sb_secret_…`), the replacement for the legacy
 * `service_role` JWT. Both authorize as the `service_role` Postgres role and
 * bypass RLS identically, but secret keys additionally return HTTP 401 when
 * used from a browser (matched on User-Agent) — a runtime backstop behind the
 * `server-only` import above.
 *
 * Supabase began migration reminders in Nov 2025 and plans to delete legacy
 * keys in late 2026, so SUPABASE_SECRET_KEY is preferred. The legacy variable
 * is still read as a fallback so an existing deployment doesn't break mid-
 * migration; drop it once the new key is in place everywhere.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set (legacy SUPABASE_SERVICE_ROLE_KEY also absent)"
    );
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
