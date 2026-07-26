import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { mapDefect, mapItem } from "@/lib/data/mappers";
import type {
  AuditEntry,
  Category,
  Defect,
  Department,
  InventoryItem,
  Profile,
} from "@/lib/types";

/**
 * The full read layer for the inventory domain. `getStoreData()` fetches every
 * entity the client store seeds from, shaped into the `lib/types.ts` interfaces
 * the UI already expects — the Supabase-backed replacement for the `INITIAL_*`
 * fixtures in lib/mock-data.ts.
 *
 * Runs under the signed-in user's RLS context (utils/supabase/server.ts). Every
 * domain table grants read to `authenticated`, so a single session sees all of
 * it.
 */

export interface StoreData {
  items: InventoryItem[];
  defects: Defect[];
  activity: AuditEntry[];
  categories: Category[];
  departments: Department[];
  units: string[];
  profiles: Profile[];
}

export async function getStoreData(): Promise<StoreData> {
  const supabase = createClient(await cookies());

  const [
    { data: profileRows },
    { data: categoryRows },
    { data: departmentRows },
    { data: unitRows },
    { data: itemRows },
    { data: defectRows },
    { data: auditRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, is_active, last_login_at, created_at")
      .order("full_name"),
    supabase.from("categories").select("id, name, created_at").order("name"),
    supabase.from("departments").select("id, name, created_at").order("name"),
    supabase.from("units").select("name").order("name"),
    supabase
      .from("inventory_items")
      .select("*, item_images(url, display_order)")
      .order("created_at", { ascending: false }),
    supabase
      .from("defects")
      .select("*, repair_events(id, status, note, user_id, created_at)")
      .order("date_reported", { ascending: false }),
    supabase
      .from("audit_log")
      .select("id, occurred_at, user_id, action_type, record_label, detail")
      .order("occurred_at", { ascending: false })
      .limit(200),
  ]);

  const profiles: Profile[] = (profileRows ?? []) as Profile[];
  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));

  const defects: Defect[] = (defectRows ?? []).map((row) =>
    mapDefect(row, nameById)
  );

  const activity: AuditEntry[] = (auditRows ?? []).map((row) => ({
    id: row.id as string,
    timestamp: row.occurred_at as string,
    user: row.user_id ? nameById.get(row.user_id as string) ?? "Unknown" : "System",
    actionType: row.action_type as AuditEntry["actionType"],
    recordLabel: row.record_label as string,
    detail: row.detail as string,
  }));

  return {
    items: (itemRows ?? []).map(mapItem),
    defects,
    activity,
    categories: (categoryRows ?? []) as Category[],
    departments: (departmentRows ?? []) as Department[],
    units: (unitRows ?? []).map((u) => u.name as string),
    profiles,
  };
}
