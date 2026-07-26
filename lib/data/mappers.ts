import type { Defect, InventoryItem } from "@/lib/types";

/**
 * Pure row → interface mappers shared by the read layer (lib/data/inventory.ts)
 * and the server actions (which re-read a row after writing it). Kept
 * dependency-free so both server contexts can import them.
 */

export function mapItem(row: Record<string, unknown>): InventoryItem {
  const images =
    (row.item_images as { url: string; display_order: number }[] | null) ?? [];
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
    created_by: (row.created_by as string | null) ?? null,
    updated_by: (row.updated_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    images: [...images]
      .sort((a, b) => a.display_order - b.display_order)
      .map((img) => img.url),
    unit_of_measure: row.unit_of_measure as string,
    asset_type: row.asset_type as InventoryItem["asset_type"],
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
