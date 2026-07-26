"use server";

import { getActor, getSupabase, writeAudit } from "@/lib/data/helpers";
import type { AuditEntry } from "@/lib/types";

/**
 * Records that an access email (invite / sign-in link) was sent, from the
 * Settings user panel. The email itself is sent by app/actions/auth.ts; this
 * only writes the audit-trail entry so the activity feed reflects it.
 */
export async function logAccessEmail(
  name: string,
  kind: "invite" | "sign-in"
): Promise<{ activity: AuditEntry } | { error: string }> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const activity = await writeAudit(
    supabase,
    actor,
    "Settings",
    name,
    kind === "invite" ? "Invite sent." : "Sign-in link sent."
  );
  return { activity };
}
