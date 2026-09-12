import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { DashboardStats } from "@/lib/api-types";

/**
 * Dashboard aggregates — one RPC round trip.
 *
 * Every number here used to be computed in the browser by iterating the full
 * item and defect arrays (app/(app)/dashboard/page.tsx). The SQL in migration
 * 0008 is a transcription of that logic; keep the two in step if either moves.
 * Migration 0012 adds the 30-day comparisons and the open-defect rows.
 */

export type { DashboardStats, LowStockItem } from "@/lib/api-types";

/**
 * What a pre-0012 database omits.
 *
 * `supabase db push` is a manual step, so the UI can reach an environment
 * whose function still returns the 0008 shape. Spreading the RPC result over
 * these makes that case render an empty defect table and "+0 added" rather
 * than crash on `stats.openDefects.map`. Once 0012 is pushed everywhere this
 * is dead weight and can go.
 */
const V2_DEFAULTS = {
  itemsAddedLast30: 0,
  defectsOpenedLast30: 0,
  defectsResolvedLast30: 0,
  openDefects: [],
  openDefectsTotal: 0,
  highOpenCount: 0,
  oldestOpenDays: 0,
} satisfies Partial<DashboardStats>;

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase.rpc("dashboard_stats", {
    low_stock_limit: 50,
  });

  // Throw rather than return zeroes: a failed aggregate that renders as "0
  // assets" is indistinguishable from an empty inventory, and the empty state
  // would tell the user to add their first item. React Query retries this.
  if (error) throw new Error(`dashboard_stats failed: ${error.message}`);
  if (!data) throw new Error("dashboard_stats returned no rows");

  return { ...V2_DEFAULTS, ...(data as Partial<DashboardStats>) } as DashboardStats;
}
