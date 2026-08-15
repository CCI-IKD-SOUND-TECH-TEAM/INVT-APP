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
 */

export type { DashboardStats, LowStockItem } from "@/lib/api-types";

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

  return data as DashboardStats;
}
