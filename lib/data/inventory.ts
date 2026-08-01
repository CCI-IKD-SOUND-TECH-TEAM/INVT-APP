import "server-only";

import { cookies } from "next/headers";
import { subWeeks } from "date-fns";
import { createClient } from "@/utils/supabase/server";
import { mapCheckEntry, mapCheckSession, mapDefect, mapItem } from "@/lib/data/mappers";
import { weekStartIso } from "@/lib/checks";
import type {
  AuditEntry,
  Category,
  CheckEntry,
  CheckSession,
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
  checkSessions: CheckSession[];
  /** item_id → last time the item was seen (present/issue) in any check. */
  lastConfirmed: Record<string, string>;
}

export async function getStoreData(): Promise<StoreData> {
  const supabase = createClient(await cookies());

  const currentWeek = weekStartIso();
  const historyCutoff = weekStartIso(subWeeks(new Date(), 12));

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

  // Check sessions: the last 12 weeks of history, plus any in-progress session
  // regardless of age (they stay resumable forever).
  const [{ data: sessionRows }, { data: confirmedRows }] = await Promise.all([
    supabase
      .from("check_sessions")
      .select("*")
      .or(`week_start.gte.${historyCutoff},status.eq.in_progress`)
      .order("week_start", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("item_last_confirmed").select("item_id, last_confirmed_at"),
  ]);

  // Entries are only needed where the UI reads per-item detail: resumable
  // (in-progress) sessions and current-week sessions (set-down diff, dashboard).
  // Older completed sessions render from their summary counters alone.
  const sessions = (sessionRows ?? []) as Record<string, unknown>[];
  const idsNeedingEntries = sessions
    .filter(
      (s) => s.status === "in_progress" || s.week_start === currentWeek
    )
    .map((s) => s.id as string);

  let entriesBySession = new Map<string, CheckEntry[]>();
  if (idsNeedingEntries.length > 0) {
    const { data: entryRows } = await supabase
      .from("check_entries")
      .select("*")
      .in("session_id", idsNeedingEntries);
    entriesBySession = (entryRows ?? []).reduce((acc, row) => {
      const entry = mapCheckEntry(row);
      const list = acc.get(entry.session_id);
      if (list) list.push(entry);
      else acc.set(entry.session_id, [entry]);
      return acc;
    }, new Map<string, CheckEntry[]>());
  }

  const checkSessions: CheckSession[] = sessions.map((row) =>
    mapCheckSession(row, entriesBySession.get(row.id as string) ?? [])
  );

  const lastConfirmed: Record<string, string> = {};
  for (const row of confirmedRows ?? []) {
    lastConfirmed[row.item_id as string] = row.last_confirmed_at as string;
  }

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
    checkSessions,
    lastConfirmed,
  };
}
