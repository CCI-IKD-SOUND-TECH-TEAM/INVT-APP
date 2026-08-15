import type {
  AssetType,
  AuditEntry,
  Category,
  DefectStatus,
  Defect,
  Department,
  ItemStatus,
  Profile,
} from "@/lib/types";

/**
 * Wire shapes for the read endpoints — the contract between lib/data/* (which
 * produces them) and lib/queries/* (which consumes them).
 *
 * They live here, in a module with no `server-only` import and no runtime
 * dependencies, because both sides of the RSC boundary need them. Declaring
 * them next to the read functions instead would put a client component one
 * `import type` away from a server-only module, and that edge is not reliably
 * erased through the client graph — the build rejects it.
 */

export interface Reference {
  categories: Category[];
  departments: Department[];
  units: string[];
  profiles: Profile[];
}

export interface LowStockItem {
  id: string;
  item_name: string;
  quantity: number;
  minimum_stock_threshold: number | null;
  category_id: string;
  category_name: string;
}

export interface DashboardStats {
  /** Includes retired — drives the "No inventory yet" empty state. */
  totalItems: number;
  totalAssets: number;
  activeAssets: number;
  defectiveAssets: number;
  lowStockCount: number;
  /** Capped by the RPC — this feeds a panel, not a report. */
  lowStockItems: LowStockItem[];
  categoryBreakdown: { category: string; count: number }[];
  defectCounts: Record<DefectStatus, number>;
}

/**
 * One row of `inventory_items_list` (migration 0008). Narrower than
 * InventoryItem by design: description, remarks, serial_number, created_by and
 * updated_by are not on the list card and are not in the list payload.
 */
export interface ItemListRow {
  id: string;
  item_name: string;
  category_id: string;
  department_id: string;
  quantity: number;
  minimum_stock_threshold: number | null;
  status: ItemStatus;
  location: string | null;
  date_acquired: string | null;
  estimated_value: number | null;
  unit_of_measure: string;
  asset_type: AssetType;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
  category_name: string;
  department_name: string;
  first_image_url: string | null;
  /**
   * Non-retired unit rows — the same number as `quantity` for a unit-tracked
   * item. 0 means the item isn't unit-tracked, so `status` above describes the
   * whole group.
   */
  unit_count: number;
  /**
   * Units currently Defective or Under Repair — a subset of `unit_count`, so
   * the card reads `defective_unit_count of unit_count`.
   */
  defective_unit_count: number;
  /**
   * Last time the item was physically seen in a check. Attached per page by
   * getItemsPage rather than joined into the view — the underlying view is a
   * full aggregate over check_entries, so it is queried for the visible ids
   * only.
   */
  last_confirmed_at?: string | null;
}

export interface ItemsPage {
  rows: ItemListRow[];
  /** Total matching the filters, ignoring pagination — drives the pager. */
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Id + name only, for the "which item?" pickers. The defect log and the check
 * walkthrough need every non-retired item in a select, but nothing else about
 * them — this is ~50 bytes a row instead of a full item.
 */
export interface ItemOption {
  id: string;
  item_name: string;
}

/**
 * Absolute per-status counts for the filter chips. Independent of the active
 * filters, so it is cached separately from any list page.
 */
export interface ItemStatusCounts {
  byStatus: Record<ItemStatus, number>;
  /** Every item, retired included — the "filtered from N" denominator. */
  total: number;
  /** Non-retired — the "All" chip. */
  totalActive: number;
}

/**
 * Everything /reports needs, in one payload. The only read that legitimately
 * wants the full dataset — reports are cross-entity exports with no filter to
 * push into SQL. `truncated` is set when PostgREST's max_rows clipped the item
 * list, so a report can say so instead of silently describing a subset.
 */
export interface ReportsDataset {
  items: ItemListRow[];
  defects: DefectWithItem[];
  activity: AuditEntry[];
  totalItems: number;
  truncated: boolean;
}

/**
 * Item counts keyed by term name, for the three Settings lists. Every managed
 * taxonomy appears here — a term nothing uses reports 0 rather than being
 * absent, so the panel can always render a count.
 */
export interface TaxonomyUsage {
  categories: Record<string, number>;
  units: Record<string, number>;
  departments: Record<string, number>;
}

/**
 * A defect plus the two item fields the list renders. The defects page used to
 * pull every item purely to resolve `getItem(d.item_id)?.item_name`.
 */
export interface DefectWithItem extends Defect {
  item_name: string;
  category_id: string;
  /**
   * Label of the affected unit, resolved server-side. Null when the defect is
   * against the whole item.
   */
  unit_label: string | null;
  unit_serial_number: string | null;
}
