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
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;

  // prototype-only (not in DB schema)
  images: string[];
  unit_of_measure: string;
  asset_type: AssetType;
}

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

export type AuditActionType =
  | "Create"
  | "Edit"
  | "Retire"
  | "Reactivate"
  | "Defect"
  | "Repair Status Change"
  | "Settings";

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  actionType: AuditActionType;
  recordLabel: string;
  detail: string;
}

export const CURRENT_USER = "Tolu Adebayo";
export const CURRENT_USER_ID = "usr-tolu-adebayo";

export const USERS = [
  "Tolu Adebayo",
  "Ngozi Eze",
  "Chuka Obi",
  "Feyi Bankole",
  "Sarah Johnson",
];

export const DEPARTMENTS: DepartmentName[] = ["Sound", "Light", "Projection"];

export const CATEGORIES = [
  "Speakers",
  "Microphones",
  "Mixing Consoles",
  "Cabling & Connectors",
  "Lighting Fixtures",
  "Lighting Controllers",
  "Projectors",
  "Screens & Mounts",
  "Stands & Rigging",
  "Power & Batteries",
];

export const UNITS_OF_MEASURE = ["Piece", "Box", "Set", "Pair", "Roll"];
