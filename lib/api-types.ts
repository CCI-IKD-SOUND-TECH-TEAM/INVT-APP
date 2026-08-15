import type {
  AssetType,
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
 * A defect plus the two item fields the list renders. The defects page used to
 * pull every item purely to resolve `getItem(d.item_id)?.item_name`.
 */
export interface DefectWithItem extends Defect {
  item_name: string;
  category_id: string;
}
