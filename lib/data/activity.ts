import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { AuditEntry } from "@/lib/types";

/**
 * Audit log, newest first.
 *
 * `limit` is a real parameter rather than a fixed 200: the dashboard panel
 * renders `activity.slice(0, 10)` and the reports page wants the long tail.
 * Fetching 200 rows to display 10 was most of the audit payload.
 */
export async function getActivity(limit = 10): Promise<AuditEntry[]> {
  const supabase = createClient(await cookies());

  const [{ data, error }, { data: profileRows, error: profErr }] =
    await Promise.all([
      supabase
        .from("audit_log")
        .select("id, occurred_at, user_id, action_type, record_label, detail")
        .order("occurred_at", { ascending: false })
        .limit(limit),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const failure = error ?? profErr;
  if (failure) throw new Error(`getActivity failed: ${failure.message}`);

  const nameById = new Map(
    (profileRows ?? []).map((p) => [p.id as string, p.full_name as string])
  );

  return (data ?? []).map((row) => ({
    id: row.id as string,
    timestamp: row.occurred_at as string,
    user: row.user_id
      ? nameById.get(row.user_id as string) ?? "Unknown"
      : "System",
    actionType: row.action_type as AuditEntry["actionType"],
    recordLabel: row.record_label as string,
    detail: row.detail as string,
  }));
}
