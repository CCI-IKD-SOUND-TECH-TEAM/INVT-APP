import { queryOptions } from "@tanstack/react-query";
import { fetchJson, toSearchParams } from "@/lib/queries/fetch";
import {
  normalizeItemFilters,
  queryKeys,
  type ItemFilters,
} from "@/lib/queries/keys";
import type {
  AuditEntry,
  CheckSession,
  DefectStatus,
  InventoryItem,
} from "@/lib/types";

/**
 * Query definitions, shared by both sides of the RSC boundary: a page
 * prefetches with `queryClient.prefetchQuery(xQuery())` on the server and the
 * client component below it calls `useQuery(xQuery())` with the identical key,
 * so hydrated data is already in place on first paint.
 *
 * Payload types come from lib/api-types, not from lib/data/*. Importing them
 * from the read layer — even with `import type` — puts a client component one
 * edge away from a `server-only` module, which the build rejects.
 */

import type {
  DashboardStats,
  DefectWithItem,
  ItemListRow,
  ItemOption,
  ItemStatusCounts,
  ItemsPage,
  Reference,
  ReportsDataset,
  TaxonomyUsage,
} from "@/lib/api-types";

export type {
  DashboardStats,
  DefectWithItem,
  ItemListRow,
  ItemOption,
  ItemStatusCounts,
  ItemsPage,
  Reference,
  ReportsDataset,
  TaxonomyUsage,
};

export function referenceQuery() {
  return queryOptions({
    queryKey: queryKeys.reference(),
    queryFn: ({ signal }) => fetchJson<Reference>("/api/reference", signal),
    // Taxonomy changes a few times a year. Refetching it per route is pure
    // overhead, and a stale category name for an hour is harmless.
    staleTime: 60 * 60_000,
  });
}

export function reportsQuery() {
  return queryOptions({
    queryKey: queryKeys.reports(),
    queryFn: ({ signal }) =>
      fetchJson<ReportsDataset>("/api/reports", signal),
    // The heaviest read in the app; don't refetch it while someone is working
    // through report definitions.
    staleTime: 5 * 60_000,
  });
}

export function taxonomyUsageQuery() {
  return queryOptions({
    queryKey: queryKeys.taxonomyUsage(),
    queryFn: ({ signal }) =>
      fetchJson<TaxonomyUsage>("/api/taxonomy/usage", signal),
  });
}

export function dashboardQuery() {
  return queryOptions({
    queryKey: queryKeys.dashboard(),
    queryFn: ({ signal }) => fetchJson<DashboardStats>("/api/dashboard", signal),
  });
}

export function activityQuery(limit = 10) {
  return queryOptions({
    queryKey: queryKeys.activity(limit),
    queryFn: ({ signal }) =>
      fetchJson<AuditEntry[]>(`/api/activity?limit=${limit}`, signal),
  });
}

export function itemsQuery(filters: Partial<ItemFilters> = {}) {
  const f = normalizeItemFilters(filters);
  return queryOptions({
    queryKey: queryKeys.items.list(f),
    queryFn: ({ signal }) =>
      fetchJson<ItemsPage>(
        `/api/items${toSearchParams({
          page: f.page,
          category: f.categoryIds,
          department: f.departmentIds,
          status: f.statuses,
          lowStock: f.lowStockOnly,
          includeRetired: f.includeRetired,
          q: f.q,
          sort: f.sort,
          dir: f.dir,
        })}`,
        signal
      ),
  });
}

/**
 * Backs the "which item?" selects. `enabled` is the point: the picker lists
 * every non-retired item, so the fetch waits until a modal actually opens
 * rather than riding along with every page load.
 */
export function itemQuery(id: string) {
  return queryOptions({
    queryKey: queryKeys.items.detail(id),
    queryFn: ({ signal }) =>
      fetchJson<InventoryItem | null>(`/api/items/${id}`, signal),
    enabled: Boolean(id),
  });
}

export function itemOptionsQuery(enabled = true) {
  return queryOptions({
    queryKey: queryKeys.items.options(),
    queryFn: ({ signal }) =>
      fetchJson<ItemOption[]>("/api/items/options", signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function departmentItemCountsQuery() {
  return queryOptions({
    queryKey: queryKeys.items.departmentCounts(),
    queryFn: ({ signal }) =>
      fetchJson<Record<string, number>>("/api/departments/counts", signal),
  });
}

export function itemStatusCountsQuery() {
  return queryOptions({
    queryKey: queryKeys.items.statusCounts(),
    queryFn: ({ signal }) =>
      fetchJson<ItemStatusCounts>("/api/items/status-counts", signal),
  });
}

export function itemsByDepartmentQuery(departmentId: string) {
  return queryOptions({
    queryKey: queryKeys.items.byDepartment(departmentId),
    queryFn: ({ signal }) =>
      fetchJson<ItemListRow[]>(
        `/api/departments/${departmentId}/items`,
        signal
      ),
    enabled: Boolean(departmentId),
  });
}

export function defectsQuery(status?: DefectStatus) {
  return queryOptions({
    queryKey: queryKeys.defects.list(status),
    queryFn: ({ signal }) =>
      fetchJson<DefectWithItem[]>(
        `/api/defects${toSearchParams({ status })}`,
        signal
      ),
  });
}

export function checksQuery(weeks = 12) {
  return queryOptions({
    queryKey: queryKeys.checks.list(weeks),
    queryFn: ({ signal }) =>
      fetchJson<CheckSession[]>(`/api/checks?weeks=${weeks}`, signal),
  });
}

export function checkSessionQuery(sessionId: string) {
  return queryOptions({
    queryKey: queryKeys.checks.detail(sessionId),
    queryFn: ({ signal }) =>
      fetchJson<CheckSession | null>(`/api/checks/${sessionId}`, signal),
    enabled: Boolean(sessionId),
  });
}
