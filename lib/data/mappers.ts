import type {
  CheckEntry,
  CheckSession,
  Defect,
  InventoryItem,
  ItemUnit,
} from "@/lib/types";

/**
 * Pure row → interface mappers shared by the read layer (lib/data/inventory.ts)
 * and the server actions (which re-read a row after writing it). Kept
 * dependency-free so both server contexts can import them.
 */

export function mapItemUnit(row: Record<string, unknown>): ItemUnit {
  return {
    id: row.id as string,
    item_id: row.item_id as string,
    label: row.label as string,
    serial_number: (row.serial_number as string | null) ?? null,
    status: row.status as ItemUnit["status"],
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function mapItem(row: Record<string, unknown>): InventoryItem {
  const images =
    (row.item_images as { url: string; display_order: number }[] | null) ?? [];
  const units = (row.item_units as Record<string, unknown>[] | null) ?? [];
  return {
    id: row.id as string,
    item_name: row.item_name as string,
    description: (row.description as string | null) ?? null,
    category_id: row.category_id as string,
    department_id: row.department_id as string,
    quantity: row.quantity as number,
    minimum_stock_threshold: (row.minimum_stock_threshold as number | null) ?? null,
    status: row.status as InventoryItem["status"],
    location: (row.location as string | null) ?? null,
    date_acquired: (row.date_acquired as string | null) ?? null,
    remarks: (row.remarks as string | null) ?? null,
    serial_number: (row.serial_number as string | null) ?? null,
    // PostgREST returns numeric columns as strings — coerce to number.
    estimated_value:
      row.estimated_value == null ? null : Number(row.estimated_value),
    created_by: (row.created_by as string | null) ?? null,
    updated_by: (row.updated_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    images: [...images]
      .sort((a, b) => a.display_order - b.display_order)
      .map((img) => img.url),
    unit_of_measure: row.unit_of_measure as string,
    asset_type: row.asset_type as InventoryItem["asset_type"],
    // Ordered by label so the form and the defect picker list "Unit 1, Unit 2"
    // the same way every time — PostgREST embeds carry no ordering guarantee.
    units: units
      .map(mapItemUnit)
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
  };
}

export function mapCheckEntry(row: Record<string, unknown>): CheckEntry {
  return {
    id: row.id as string,
    session_id: row.session_id as string,
    item_id: row.item_id as string,
    result: row.result as CheckEntry["result"],
    quantity_expected: row.quantity_expected as number,
    quantity_seen: row.quantity_seen as number,
    note: (row.note as string | null) ?? null,
    checked_by: (row.checked_by as string | null) ?? null,
    checked_at: row.checked_at as string,
  };
}

export function mapCheckSession(
  row: Record<string, unknown>,
  entries: CheckEntry[] = []
): CheckSession {
  return {
    id: row.id as string,
    department_id: row.department_id as string,
    session_type: row.session_type as CheckSession["session_type"],
    week_start: row.week_start as string,
    status: row.status as CheckSession["status"],
    started_by: (row.started_by as string | null) ?? null,
    completed_by: (row.completed_by as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    total_items: (row.total_items as number | null) ?? null,
    present_count: (row.present_count as number | null) ?? null,
    missing_count: (row.missing_count as number | null) ?? null,
    issue_count: (row.issue_count as number | null) ?? null,
    shortfall_count: (row.shortfall_count as number | null) ?? null,
    na_count: (row.na_count as number | null) ?? null,
    unchecked_count: (row.unchecked_count as number | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    entries,
  };
}

export function mapDefect(
  row: Record<string, unknown>,
  nameById: Map<string, string>
): Defect {
  const events =
    (row.repair_events as {
      id: string;
      status: string;
      note: string | null;
      user_id: string | null;
      created_at: string;
    }[] | null) ?? [];
  return {
    id: row.id as string,
    item_id: row.item_id as string,
    item_unit_id: (row.item_unit_id as string | null) ?? null,
    description: row.description as string,
    date_reported: row.date_reported as string,
    reported_by: (row.reported_by as string | null) ?? "",
    severity: row.severity as Defect["severity"],
    status: row.status as Defect["status"],
    repair_start_date: (row.repair_start_date as string | null) ?? null,
    performing_party: (row.performing_party as string | null) ?? null,
    resolution_notes: (row.resolution_notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    history: [...events]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((ev) => ({
        id: ev.id,
        status: ev.status as Defect["status"],
        timestamp: ev.created_at,
        user: ev.user_id ? nameById.get(ev.user_id) ?? "Unknown" : "Unknown",
        note: ev.note ?? undefined,
      })),
  };
}
