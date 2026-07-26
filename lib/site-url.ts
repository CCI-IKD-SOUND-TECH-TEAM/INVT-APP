/**
 * Absolute base URL for links that leave the app (magic links, email CTAs).
 *
 * Relative URLs are meaningless in an inbox, and request headers aren't
 * available in the auth hook (Supabase calls it server-to-server) or in cron,
 * so this has to come from configuration.
 *
 * Order: explicit config first, then Vercel's per-deployment URL so preview
 * deployments link to themselves, then localhost.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  // Set by Vercel on every deployment; lacks a protocol.
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  return "http://localhost:3000";
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
