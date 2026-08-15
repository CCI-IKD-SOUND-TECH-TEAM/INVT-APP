import "server-only";

import { cookies } from "next/headers";
import { subWeeks } from "date-fns";
import { createClient } from "@/utils/supabase/server";
import { mapCheckEntry, mapCheckSession } from "@/lib/data/mappers";
import { weekStartIso } from "@/lib/checks";
import type { CheckEntry, CheckSession } from "@/lib/types";

/**
 * Check session reads.
 *
 * Entry-loading policy is carried over from the old full-table read: entries
 * are only needed where the UI reads per-item detail — resumable (in-progress) sessions
 * and current-week sessions. Older completed sessions render from their summary
 * counters alone.
 */

export async function getChecks(weeks = 12): Promise<CheckSession[]> {
  const supabase = createClient(await cookies());

  const currentWeek = weekStartIso();
  const historyCutoff = weekStartIso(subWeeks(new Date(), weeks));

  const { data: sessionRows, error } = await supabase
    .from("check_sessions")
    .select("*")
    // In-progress sessions stay resumable forever, regardless of age.
    .or(`week_start.gte.${historyCutoff},status.eq.in_progress`)
    .order("week_start", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getChecks failed: ${error.message}`);

  const sessions = (sessionRows ?? []) as Record<string, unknown>[];
  const idsNeedingEntries = sessions
    .filter((s) => s.status === "in_progress" || s.week_start === currentWeek)
    .map((s) => s.id as string);

  const entriesBySession = await loadEntries(supabase, idsNeedingEntries);

  return sessions.map((row) =>
    mapCheckSession(row, entriesBySession.get(row.id as string) ?? [])
  );
}

/** One session with its entries, always — this backs the session detail screen. */
export async function getCheckSession(
  sessionId: string
): Promise<CheckSession | null> {
  const supabase = createClient(await cookies());

  const [{ data: row, error }, { data: entryRows, error: entryErr }] =
    await Promise.all([
      supabase.from("check_sessions").select("*").eq("id", sessionId).maybeSingle(),
      supabase.from("check_entries").select("*").eq("session_id", sessionId),
    ]);

  const failure = error ?? entryErr;
  if (failure) throw new Error(`getCheckSession failed: ${failure.message}`);
  if (!row) return null;

  return mapCheckSession(row, (entryRows ?? []).map(mapCheckEntry));
}

/**
 * item_id → last time the item was seen (present/issue) in any check.
 *
 * Scoped to a set of item ids on purpose. The `item_last_confirmed` view is a
 * `group by item_id` over the whole check_entries table; selecting all of it
 * returns one row per item ever checked and gets slower as history accumulates.
 * Callers pass the ~25 ids currently on screen.
 */
export async function getLastConfirmed(
  itemIds: string[]
): Promise<Record<string, string>> {
  if (itemIds.length === 0) return {};

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("item_last_confirmed")
    .select("item_id, last_confirmed_at")
    .in("item_id", itemIds);

  if (error) throw new Error(`getLastConfirmed failed: ${error.message}`);

  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    out[row.item_id as string] = row.last_confirmed_at as string;
  }
  return out;
}

type SupabaseClient = ReturnType<typeof createClient>;

async function loadEntries(
  supabase: SupabaseClient,
  sessionIds: string[]
): Promise<Map<string, CheckEntry[]>> {
  const bySession = new Map<string, CheckEntry[]>();
  if (sessionIds.length === 0) return bySession;

  const { data, error } = await supabase
    .from("check_entries")
    .select("*")
    .in("session_id", sessionIds);

  if (error) throw new Error(`loadEntries failed: ${error.message}`);

  for (const row of data ?? []) {
    const entry = mapCheckEntry(row);
    const list = bySession.get(entry.session_id);
    if (list) list.push(entry);
    else bySession.set(entry.session_id, [entry]);
  }
  return bySession;
}
