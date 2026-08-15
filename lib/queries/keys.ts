import type { DefectStatus, ItemStatus } from "@/lib/types";

/**
 * Every query key in the app, in one place.
 *
 * Keys are hierarchical so a mutation can invalidate a whole branch without
 * knowing the individual filter combinations sitting under it — retiring an
 * item invalidates `["items"]` and every cached page goes stale at once.
 */

/**
 * Rows per page for the inventory list. Lives here rather than in the page so
 * the server read layer and the client pager cannot disagree about it — a
 * mismatch would silently drop or duplicate rows between pages.
 */
export const ITEMS_PAGE_SIZE = 25;

export type ItemSort =
  | "name"
  | "category"
  | "status"
  | "quantity"
  | "dateAcquired";

export interface ItemFilters {
  page: number;
  /** Category and department arrive as ids, not the display names the UI holds. */
  categoryIds: string[];
  departmentIds: string[];
  statuses: ItemStatus[];
  lowStockOnly: boolean;
  includeRetired: boolean;
  q: string;
  sort: ItemSort;
  dir: "asc" | "desc";
}

export const DEFAULT_ITEM_FILTERS: ItemFilters = {
  page: 1,
  categoryIds: [],
  departmentIds: [],
  statuses: [],
  lowStockOnly: false,
  includeRetired: false,
  q: "",
  sort: "name",
  dir: "asc",
};

/**
 * Array order must not create distinct cache entries for the same filter set,
 * and a stray "  Speakers " must not either — normalise before keying.
 */
export function normalizeItemFilters(
  filters: Partial<ItemFilters> = {}
): ItemFilters {
  const merged = { ...DEFAULT_ITEM_FILTERS, ...filters };
  return {
    ...merged,
    page: Math.max(1, Math.floor(merged.page)),
    categoryIds: [...merged.categoryIds].sort(),
    departmentIds: [...merged.departmentIds].sort(),
    statuses: [...merged.statuses].sort(),
    q: merged.q.trim(),
  };
}

export const queryKeys = {
  reference: () => ["reference"] as const,

  dashboard: () => ["dashboard"] as const,

  taxonomyUsage: () => ["taxonomy-usage"] as const,

  reports: () => ["reports"] as const,

  activity: (limit: number) => ["activity", limit] as const,

  items: {
    all: () => ["items"] as const,
    list: (filters: ItemFilters) =>
      ["items", "list", normalizeItemFilters(filters)] as const,
    detail: (id: string) => ["items", "detail", id] as const,
    byDepartment: (departmentId: string) =>
      ["items", "by-department", departmentId] as const,
    options: () => ["items", "options"] as const,
    departmentCounts: () => ["items", "department-counts"] as const,
    statusCounts: () => ["items", "status-counts"] as const,
    countByCategory: (categoryId: string) =>
      ["items", "count", "category", categoryId] as const,
    countByUnit: (unit: string) => ["items", "count", "unit", unit] as const,
  },

  defects: {
    all: () => ["defects"] as const,
    list: (status?: DefectStatus) => ["defects", "list", status ?? null] as const,
  },

  checks: {
    all: () => ["checks"] as const,
    list: (weeks: number) => ["checks", "list", weeks] as const,
    detail: (sessionId: string) => ["checks", "detail", sessionId] as const,
  },
} as const;
