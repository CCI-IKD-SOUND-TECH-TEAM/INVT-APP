import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { StoreProvider } from "@/lib/store";
import { getStoreData } from "@/lib/data/inventory";
import { createClient } from "@/utils/supabase/server";
import type { SessionUser } from "@/lib/types";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already gates this route group; reaching here without a user means
  // the session died between that check and render. Bounce rather than render
  // the shell with no identity to stamp on audit entries.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  // A signed-in user with no profile row shouldn't happen — the
  // on_auth_user_created trigger creates one — but fall back to the email
  // local-part rather than crashing the entire app group.
  const currentUser: SessionUser = {
    id: user.id,
    full_name: profile?.full_name ?? user.email?.split("@")[0] ?? "Unknown",
    email: profile?.email ?? user.email ?? "",
  };

  // Queried separately from the profile row above so an environment where
  // migration 0004 hasn't been applied yet degrades to "offer the tour"
  // instead of breaking the name/email fallback.
  const { data: tourRow } = await supabase
    .from("profiles")
    .select("tour_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  const seed = await getStoreData();

  return (
    <StoreProvider currentUser={currentUser} seed={seed}>
      <AppShell tourAutoStart={!tourRow?.tour_completed_at}>{children}</AppShell>
    </StoreProvider>
  );
}
