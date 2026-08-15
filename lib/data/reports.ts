import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getActivity } from "@/lib/data/activity";
import { getDefects } from "@/lib/data/defects";
import type { ItemListRow, ReportsDataset } from "@/lib/api-types";

/**
 * The one read that genuinely needs the whole dataset.
 *
 * Reports produce cross-entity exports — value by category, defect history,
 * audit extracts — so there is no filter to push down. What this does trim is
 * the columns: it reads the list view, which drops description, remarks,
 * serial_number and the image join that the reports never render.
 *
 * It is also fetched only when /reports is opened, rather than by every route
 * via the layout. That is the actual win here, not payload size.
 */

/** Rows above this are dropped by PostgREST's `max_rows` (supabase/config.toml). */
const ROW_CEILING = 1000;

export async function getReportsDataset(): Promise<ReportsDataset> {
  const supabase = createClient(await cookies());

  const [itemsResult, defects, activity] = await Promise.all([
    // Retired items included — reports cover history, not just active stock.
    supabase
      .from("inventory_items_list")
      .select("*", { count: "exact" })
      .order("item_name"),
    getDefects(),
    getActivity(200),
  ]);

  if (itemsResult.error) {
    throw new Error(`getReportsDataset failed: ${itemsResult.error.message}`);
  }

  const items = (itemsResult.data ?? []) as ItemListRow[];
  const total = itemsResult.count ?? items.length;

  // Surfaced rather than silent: PostgREST caps a response at max_rows, so past
  // that ceiling a report would quietly describe a subset of the inventory as
  // if it were all of it. The UI shows a warning when this is set.
  const truncated = items.length < total;
  if (truncated) {
    console.warn(
      `[reports] item list truncated at ${items.length} of ${total} rows — ` +
        `raise max_rows in supabase/config.toml or page this read`
    );
  }

  return { items, defects, activity, totalItems: total, truncated };
}

export { ROW_CEILING };
