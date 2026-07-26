import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { StoreProvider } from "@/lib/store";
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

  return (
    <StoreProvider currentUser={currentUser}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
