"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  activityQuery,
  checksQuery,
  dashboardQuery,
  itemStatusCountsQuery,
  itemsQuery,
  referenceQuery,
} from "@/lib/queries";
import { ITEMS_PAGE_SIZE } from "@/lib/queries/keys";
import { isLowStock } from "@/lib/inventory";
import type {
  DashboardStats,
  ItemListRow,
  ItemStatusCounts,
  LowStockItem,
} from "@/lib/api-types";
import type { DefectStatus, ItemStatus } from "@/lib/types";
import { SEED } from "./fixture";

/**
 * Fills the query cache from the preview fixture.
 *
 * Companion to the TEMPORARY harness in ./page.tsx — delete both together.
 *
 * The migrated screens read React Query, not the store, so the harness has to
 * populate the same keys their server prefetch would. The aggregation below
 * mirrors dashboard_stats() in migration 0008; it exists only so the fixture
 * can drive the dashboard offline, and is not a second implementation anything
 * in the real app depends on.
 */
export function usePreviewCache() {
  const queryClient = useQueryClient();

  queryClient.setQueryData(referenceQuery().queryKey, {
    categories: SEED.categories,
    departments: SEED.departments,
    units: SEED.units,
    profiles: SEED.profiles,
  });

  queryClient.setQueryData(activityQuery(10).queryKey, SEED.activity.slice(0, 10));
  queryClient.setQueryData(checksQuery(1).queryKey, SEED.checkSessions);
  queryClient.setQueryData(dashboardQuery().queryKey, buildStats());

  // The inventory list's opening state: page 1, no filters, name ascending.
  // Only this key is seeded — filtering or paging in the harness falls through
  // to the real endpoint, which is unauthenticated here and will bounce.
  const rows = buildRows();
  queryClient.setQueryData(itemsQuery({ page: 1 }).queryKey, {
    rows: rows.slice(0, ITEMS_PAGE_SIZE),
    total: rows.length,
    page: 1,
    pageSize: ITEMS_PAGE_SIZE,
  });
  queryClient.setQueryData(itemStatusCountsQuery().queryKey, buildCounts());
}

/** Fixture InventoryItems projected into the list-view row shape. */
function buildRows(): ItemListRow[] {
  const { items, categories, departments } = SEED;
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));

  return items
    .filter((i) => i.status !== "Retired")
    .sort((a, b) => a.item_name.localeCompare(b.item_name))
    .map((i) => ({
      id: i.id,
      item_name: i.item_name,
      category_id: i.category_id,
      department_id: i.department_id,
      quantity: i.quantity,
      minimum_stock_threshold: i.minimum_stock_threshold ?? null,
      status: i.status,
      location: i.location ?? null,
      date_acquired: i.date_acquired ?? null,
      estimated_value: i.estimated_value ?? null,
      unit_of_measure: i.unit_of_measure,
      asset_type: i.asset_type,
      is_low_stock: isLowStock(i),
      created_at: i.created_at,
      updated_at: i.updated_at,
      category_name: categoryName.get(i.category_id) ?? "—",
      department_name: departmentName.get(i.department_id) ?? "—",
      first_image_url: i.images[0] ?? null,
      last_confirmed_at: SEED.lastConfirmed[i.id] ?? null,
    }));
}

function buildCounts(): ItemStatusCounts {
  const byStatus = {
    Available: 0,
    "In Use": 0,
    Defective: 0,
    "Under Repair": 0,
    Retired: 0,
  } as Record<ItemStatus, number>;

  for (const item of SEED.items) byStatus[item.status] += 1;

  const total = SEED.items.length;
  return { byStatus, total, totalActive: total - byStatus.Retired };
}

function buildStats(): DashboardStats {
  const { items, defects, categories } = SEED;
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const nonRetired = items.filter((i) => i.status !== "Retired");

  const lowStockItems: LowStockItem[] = nonRetired
    .filter(isLowStock)
    .map((i) => ({
      id: i.id,
      item_name: i.item_name,
      quantity: i.quantity,
      minimum_stock_threshold: i.minimum_stock_threshold ?? null,
      category_id: i.category_id,
      category_name: categoryName.get(i.category_id) ?? "—",
    }));

  const byCategory = new Map<string, number>();
  for (const i of nonRetired) {
    const name = categoryName.get(i.category_id) ?? "—";
    byCategory.set(name, (byCategory.get(name) ?? 0) + 1);
  }
  const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const categoryBreakdown = sorted
    .slice(0, 7)
    .map(([category, count]) => ({ category, count }));
  const rest = sorted.slice(7);
  if (rest.length > 0) {
    categoryBreakdown.push({
      category: `Other (${rest.length})`,
      count: rest.reduce((sum, [, count]) => sum + count, 0),
    });
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const withinWindow = (status: DefectStatus) =>
    defects.filter(
      (d) =>
        d.status === status &&
        new Date(d.history[d.history.length - 1]?.timestamp ?? 0).getTime() >=
          thirtyDaysAgo
    ).length;

  return {
    totalItems: items.length,
    totalAssets: nonRetired.length,
    activeAssets: items.filter(
      (i) => i.status === "Available" || i.status === "In Use"
    ).length,
    defectiveAssets: items.filter(
      (i) => i.status === "Defective" || i.status === "Under Repair"
    ).length,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    categoryBreakdown,
    defectCounts: {
      Open: defects.filter((d) => d.status === "Open").length,
      "Under Repair": defects.filter((d) => d.status === "Under Repair").length,
      Resolved: withinWindow("Resolved"),
      "Not Repairable": withinWindow("Not Repairable"),
    },
  };
}
