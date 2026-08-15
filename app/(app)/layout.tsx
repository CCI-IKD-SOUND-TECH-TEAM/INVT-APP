import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { SessionProvider } from "@/lib/session";
import { createClient } from "@/utils/supabase/server";
import type { SessionUser } from "@/lib/types";

/**
 * The shell, and the identity it needs — nothing more.
 *
 * This layout used to fetch every row of every domain table before any route
 * could paint, and hand it to a client store. Each route now prefetches only
 * the queries it renders (see the page.tsx beside each client component).
 */
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(await cookies());

  // getClaims() over getUser(): the JWT is verified locally against a cached
  // JWKS instead of round-tripping to the Auth server, and it carries the id
  // and email this layout needs. Same trust level — the signature is checked.
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;

  // proxy.ts already gates this route group; reaching here without a session
  // means it died between that check and render. Bounce rather than render the
  // shell with no identity to stamp on audit entries.
  if (!claims) redirect("/login");

  // tour_completed_at stays a separate select from the name/email row: merging
  // them would mean an environment where migration 0004 hasn't been applied
  // errors the whole select and loses the name/email fallback too. Two parallel
  // queries cost about what one does; a lost fallback costs a broken app group.
  const [{ data: profile }, { data: tourRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", claims.sub)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("tour_completed_at")
      .eq("id", claims.sub)
      .maybeSingle(),
  ]);

  // A signed-in user with no profile row shouldn't happen — the
  // on_auth_user_created trigger creates one — but fall back to the email
  // local-part rather than crashing the entire app group.
  const currentUser: SessionUser = {
    id: claims.sub,
    full_name: profile?.full_name ?? claims.email?.split("@")[0] ?? "Unknown",
    email: profile?.email ?? claims.email ?? "",
  };

  return (
    <SessionProvider currentUser={currentUser}>
      <AppShell tourAutoStart={!tourRow?.tour_completed_at}>{children}</AppShell>
    </SessionProvider>
  );
}
