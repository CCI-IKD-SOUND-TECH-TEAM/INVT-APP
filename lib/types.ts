export type ItemStatus =
  | "Available"
  | "In Use"
  | "Defective"
  | "Under Repair"
  | "Retired";

export type DefectSeverity = "Low" | "Medium" | "High";

export type DefectStatus = "Open" | "Under Repair" | "Resolved" | "Not Repairable";

export type AssetType =
  | "Equipment"
  | "Furniture"
  | "Consumable"
  | "Electronics"
  | "Other";

export type DepartmentName = "Sound" | "Light" | "Projection";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  description?: string | null;
  category_id: string;
  department_id: string;
  quantity: number;
  minimum_stock_threshold?: number | null;
  status: ItemStatus;
  location?: string | null;
  date_acquired?: string | null;
  remarks?: string | null;
  serial_number?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;

  // prototype-only (not in DB schema)
  images: string[];
  unit_of_measure: string;
  asset_type: AssetType;
}

/** Shape the item form / bulk import hand to `createItem`. */
export type NewItemInput = Omit<
  InventoryItem,
  "id" | "status" | "created_by" | "updated_by" | "created_at" | "updated_at"
>;

export interface ItemImage {
  id: string;
  item_id: string;
  storage_path: string;
  display_order: number;
  created_at: string;
}

export interface Defect {
  id: string;
  item_id: string;
  description: string;
  date_reported: string;
  reported_by: string;
  severity: DefectSeverity;
  status: DefectStatus;
  repair_start_date?: string | null;
  performing_party?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;

  // prototype-only (not in DB schema)
  history: RepairEvent[];
}

export interface RepairEvent {
  id: string;
  status: DefectStatus;
  timestamp: string;
  user: string;
  note?: string;
}

export type CheckType = "setup" | "set_down";

export type CheckSessionStatus = "in_progress" | "completed" | "abandoned";

export type CheckResult = "present" | "missing" | "issue";

export interface CheckEntry {
  id: string;
  session_id: string;
  item_id: string;
  result: CheckResult;
  /** Snapshot of the item's quantity when the entry was recorded. */
  quantity_expected: number;
  quantity_seen: number;
  note?: string | null;
  checked_by?: string | null;
  checked_at: string;
}

export interface CheckSession {
  id: string;
  department_id: string;
  session_type: CheckType;
  /** ISO date of the Sunday that opens the week (lib/checks.ts weekStartIso). */
  week_start: string;
  status: CheckSessionStatus;
  started_by?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  total_items: number | null;
  present_count: number | null;
  missing_count: number | null;
  issue_count: number | null;
  shortfall_count: number | null;
  created_at: string;
  updated_at: string;
  /** Loaded for in-progress and current-week sessions; [] for older history. */
  entries: CheckEntry[];
}

export type AuditActionType =
  | "Create"
  | "Edit"
  | "Retire"
  | "Reactivate"
  | "Defect"
  | "Repair Status Change"
  | "Settings"
  | "Check";

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  actionType: AuditActionType;
  recordLabel: string;
  detail: string;
}

/** The signed-in staff member, resolved from the Supabase session. */
export interface SessionUser {
  id: string;
  full_name: string;
  email: string;
}
