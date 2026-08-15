import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { mapItem } from "@/lib/data/mappers";
import { getLastConfirmed } from "@/lib/data/checks";
import {
  ITEMS_PAGE_SIZE,
  normalizeItemFilters,
  type ItemFilters,
  type ItemSort,
} from "@/lib/queries/keys";
import type {
  ItemListRow,
  ItemOption,
  ItemStatusCounts,
  ItemsPage,
} from "@/lib/api-types";
import type { InventoryItem, ItemStatus } from "@/lib/types";

/**
 * Item reads — the list page, the detail page, and the per-department slice the
 * check session screen walks.
 *
 * The list reads `inventory_items_list` (migration 0008) rather than the base
 * table: the view carries category/department names and the cover image, so
 * sorting by category name is plain column ordering and no embed is needed.
 */

export type { ItemListRow, ItemsPage } from "@/lib/api-types";

const SORT_COLUMNS: Record<ItemSort, string> = {
  name: "item_name",
  category: "category_name",
  status: "status",
  quantity: "quantity",
  dateAcquired: "date_acquired",
};

/**
 * `%` and `_` are PostgREST/SQL wildcards. A user typing "50%" should search
 * for the literal string, not "50 followed by anything".
 */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function getItemsPage(
  filters: Partial<ItemFilters> = {}
): Promise<ItemsPage> {
  const f = normalizeItemFilters(filters);
  const supabase = createClient(await cookies());

  let query = supabase
    .from("inventory_items_list")
    .select("*", { count: "exact" });

  if (!f.includeRetired) query = query.neq("status", "Retired");
  if (f.statuses.length > 0) query = query.in("status", f.statuses);
  if (f.categoryIds.length > 0) query = query.in("category_id", f.categoryIds);
  if (f.departmentIds.length > 0) {
    query = query.in("department_id", f.departmentIds);
  }
  if (f.lowStockOnly) query = query.eq("is_low_stock", true);
  if (f.q) query = query.ilike("item_name", `%${escapeLike(f.q)}%`);

  const ascending = f.dir === "asc";
  query = query
    // The client sorted missing dates as "", i.e. smallest — so nulls lead on
    // ascending and trail on descending. Preserve that ordering.
    .order(SORT_COLUMNS[f.sort], { ascending, nullsFirst: ascending })
    // Stable tiebreaker. Without it, rows with equal sort values can shuffle
    // between pages and an item is shown twice or skipped entirely.
    .order("id", { ascending: true });

  const from = (f.page - 1) * ITEMS_PAGE_SIZE;
  query = query.range(from, from + ITEMS_PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`getItemsPage failed: ${error.message}`);

  const rows = (data ?? []) as ItemListRow[];

  // Scoped to the ids on this page. item_last_confirmed is a group-by over the
  // whole check_entries table; selecting all of it would grow with check
  // history forever to fill one column of 25 rows.
  const lastConfirmed = await getLastConfirmed(rows.map((r) => r.id));

  return {
    rows: rows.map((row) => ({
      ...row,
      last_confirmed_at: lastConfirmed[row.id] ?? null,
    })),
    total: count ?? 0,
    page: f.page,
    pageSize: ITEMS_PAGE_SIZE,
  };
}

/**
 * Absolute per-status counts for the filter chips — deliberately unfiltered, so
 * the chips read the same whatever the list is currently showing.
 */
export async function getItemStatusCounts(): Promise<ItemStatusCounts> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("inventory_status_counts")
    .select("status, count");

  if (error) throw new Error(`getItemStatusCounts failed: ${error.message}`);

  const byStatus = {
    Available: 0,
    "In Use": 0,
    Defective: 0,
    "Under Repair": 0,
    Retired: 0,
  } as Record<ItemStatus, number>;

  for (const row of data ?? []) {
    byStatus[row.status as ItemStatus] = row.count as number;
  }

  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
  return { byStatus, total, totalActive: total - byStatus.Retired };
}

/** Full row, including the columns the list view deliberately omits. */
export async function getItemById(id: string): Promise<InventoryItem | null> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*, item_images(url, display_order), item_units(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getItemById failed: ${error.message}`);
  return data ? mapItem(data) : null;
}

/**
 * Every non-retired item in a department, for the check session screen — a
 * check walks the department's full list, so this one is deliberately unpaged.
 */
export async function getItemsByDepartment(
  departmentId: string
): Promise<ItemListRow[]> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("inventory_items_list")
    .select("*")
    .eq("department_id", departmentId)
    .neq("status", "Retired")
    .order("category_name")
    .order("item_name");

  if (error) throw new Error(`getItemsByDepartment failed: ${error.message}`);
  return (data ?? []) as ItemListRow[];
}

/**
 * Id + name for every non-retired item, for the pickers.
 *
 * Deliberately not paged: it backs a `<Select>`, which needs the full option
 * list. Callers gate the query on the picker actually being open.
 */
export async function getItemOptions(): Promise<ItemOption[]> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, item_name")
    .neq("status", "Retired")
    .order("item_name");

  if (error) throw new Error(`getItemOptions failed: ${error.message}`);
  return (data ?? []) as ItemOption[];
}

/**
 * department_id → count of non-retired items, for the weekly-check landing.
 */
export async function getDepartmentItemCounts(): Promise<
  Record<string, number>
> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("inventory_department_counts")
    .select("department_id, count");

  if (error) {
    throw new Error(`getDepartmentItemCounts failed: ${error.message}`);
  }

  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    out[row.department_id as string] = row.count as number;
  }
  return out;
}
