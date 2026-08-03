"use server";

import { after } from "next/server";
import { getActor, getSupabase, writeAudit } from "@/lib/data/helpers";
import { mapCheckEntry, mapCheckSession } from "@/lib/data/mappers";
import { CHECK_TYPE_LABEL, isShortfall, weekStartIso } from "@/lib/checks";
import { notifyCheckCompleted } from "@/app/actions/notifications";
import type {
  AuditEntry,
  CheckEntry,
  CheckResult,
  CheckSession,
  CheckType,
} from "@/lib/types";

/**
 * Weekly presence-check writes. A session is one walkthrough (department +
 * setup/set_down + week); entries upsert one row per item. Completion does
 * not require full coverage — never-marked items are recorded in
 * unchecked_count. It denormalizes summary counters onto the session, writes
 * an audit entry, and emails the team when anything is missing or short —
 * via `after()` so a slow mail send never blocks the response.
 */

export type CheckSessionResult =
  | { session: CheckSession; activity?: AuditEntry }
  | { error: string };
export type CheckEntryResult = { entry: CheckEntry } | { error: string };
export type CheckEntriesResult = { entries: CheckEntry[] } | { error: string };

type Supabase = Awaited<ReturnType<typeof getSupabase>>;

async function fetchSessionWithEntries(
  supabase: Supabase,
  sessionId: string
): Promise<CheckSession> {
  const [{ data: row }, { data: entryRows }] = await Promise.all([
    supabase.from("check_sessions").select("*").eq("id", sessionId).single(),
    supabase.from("check_entries").select("*").eq("session_id", sessionId),
  ]);
  return mapCheckSession(
    row as Record<string, unknown>,
    (entryRows ?? []).map(mapCheckEntry)
  );
}

/** Non-retired items of a department — the set a session must cover. */
async function fetchCheckableItems(
  supabase: Supabase,
  departmentId: string
): Promise<{ id: string; item_name: string; quantity: number }[]> {
  const { data } = await supabase
    .from("inventory_items")
    .select("id, item_name, quantity")
    .eq("department_id", departmentId)
    .neq("status", "Retired");
  return (data ?? []) as { id: string; item_name: string; quantity: number }[];
}

async function departmentName(
  supabase: Supabase,
  departmentId: string
): Promise<string> {
  const { data } = await supabase
    .from("departments")
    .select("name")
    .eq("id", departmentId)
    .single();
  return (data?.name as string) ?? "Department";
}

/**
 * Start (or resume) this week's session for a department + type. Idempotent:
 * an existing in-progress session is returned with its entries; a completed
 * one is an error. Loses the concurrent-start race gracefully by returning
 * the winner's session.
 */
export async function startCheckSession(input: {
  department_id: string;
  session_type: CheckType;
}): Promise<CheckSessionResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const week = weekStartIso();
  const label = CHECK_TYPE_LABEL[input.session_type];

  const { data: existing } = await supabase
    .from("check_sessions")
    .select("id, status")
    .eq("department_id", input.department_id)
    .eq("session_type", input.session_type)
    .eq("week_start", week)
    .neq("status", "abandoned")
    .maybeSingle();

  if (existing) {
    if (existing.status === "completed") {
      return {
        error: `${label} check already completed for this department this week.`,
      };
    }
    return { session: await fetchSessionWithEntries(supabase, existing.id) };
  }

  const items = await fetchCheckableItems(supabase, input.department_id);
  if (items.length === 0) {
    return { error: "No checkable items in this department yet." };
  }

  const { data: inserted, error } = await supabase
    .from("check_sessions")
    .insert({
      department_id: input.department_id,
      session_type: input.session_type,
      week_start: week,
      started_by: actor.id,
    })
    .select("*")
    .single();

  if (error) {
    // 23505 = unique violation: someone else started the same session between
    // our select and insert. Return the winner's session instead of failing.
    if (error.code === "23505") {
      const { data: winner } = await supabase
        .from("check_sessions")
        .select("id")
        .eq("department_id", input.department_id)
        .eq("session_type", input.session_type)
        .eq("week_start", week)
        .neq("status", "abandoned")
        .maybeSingle();
      if (winner) {
        return { session: await fetchSessionWithEntries(supabase, winner.id) };
      }
    }
    console.error("[checks] start failed", error);
    return { error: "Couldn't start the check. Try again." };
  }

  return { session: mapCheckSession(inserted as Record<string, unknown>, []) };
}

/** Guard that a session exists and is still in progress. */
async function requireInProgress(
  supabase: Supabase,
  sessionId: string
): Promise<
  | { session: Record<string, unknown> }
  | { error: string }
> {
  const { data: session } = await supabase
    .from("check_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { error: "This check no longer exists." };
  if (session.status !== "in_progress") {
    return { error: "This check was already completed." };
  }
  return { session };
}

/** Record (or re-record) one item's result within an in-progress session. */
export async function recordCheckEntry(input: {
  session_id: string;
  item_id: string;
  result: CheckResult;
  quantity_seen?: number;
  note?: string;
}): Promise<CheckEntryResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const guard = await requireInProgress(supabase, input.session_id);
  if ("error" in guard) return { error: guard.error };

  const { data: item } = await supabase
    .from("inventory_items")
    .select("quantity")
    .eq("id", input.item_id)
    .single();
  if (!item) return { error: "This item no longer exists." };

  const expected = item.quantity as number;
  // Missing and n/a both mean nothing was counted.
  const seen =
    input.result === "missing" || input.result === "not_applicable"
      ? 0
      : Math.max(0, input.quantity_seen ?? expected);

  const { data: row, error } = await supabase
    .from("check_entries")
    .upsert(
      {
        session_id: input.session_id,
        item_id: input.item_id,
        result: input.result,
        quantity_expected: expected,
        quantity_seen: seen,
        note: input.note ?? null,
        checked_by: actor.id,
        // Explicit so a re-mark refreshes the timestamp (default only fires
        // on insert).
        checked_at: new Date().toISOString(),
      },
      { onConflict: "session_id,item_id" }
    )
    .select("*")
    .single();

  if (error || !row) {
    console.error("[checks] record entry failed", error);
    return { error: "Couldn't save that check. Try again." };
  }

  return { entry: mapCheckEntry(row as Record<string, unknown>) };
}

/**
 * Mark every still-unchecked item present at full quantity. Race-safe:
 * `ignoreDuplicates` never overwrites an entry someone else just recorded.
 * Returns the full entry list so the client reconciles wholesale.
 */
export async function bulkMarkRemainingPresent(
  sessionId: string
): Promise<CheckEntriesResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const guard = await requireInProgress(supabase, sessionId);
  if ("error" in guard) return { error: guard.error };

  const [items, { data: existingRows }] = await Promise.all([
    fetchCheckableItems(supabase, guard.session.department_id as string),
    supabase
      .from("check_entries")
      .select("item_id")
      .eq("session_id", sessionId),
  ]);

  const marked = new Set((existingRows ?? []).map((r) => r.item_id as string));
  const remaining = items.filter((it) => !marked.has(it.id));

  if (remaining.length > 0) {
    const now = new Date().toISOString();
    const { error } = await supabase.from("check_entries").upsert(
      remaining.map((it) => ({
        session_id: sessionId,
        item_id: it.id,
        result: "present",
        quantity_expected: it.quantity,
        quantity_seen: it.quantity,
        checked_by: actor.id,
        checked_at: now,
      })),
      { onConflict: "session_id,item_id", ignoreDuplicates: true }
    );
    if (error) {
      console.error("[checks] bulk mark failed", error);
      return { error: "Couldn't mark the remaining items. Try again." };
    }
  }

  const { data: allRows } = await supabase
    .from("check_entries")
    .select("*")
    .eq("session_id", sessionId);
  return { entries: (allRows ?? []).map(mapCheckEntry) };
}

/**
 * Complete a session: write summary counters (including how many of the
 * department's current non-retired items were never marked), audit, and
 * notify when anything is missing or short. Partial completion is allowed —
 * unchecked items are counted, not rejected — but an entirely empty
 * walkthrough is not (abandon is the way out of one).
 */
export async function completeCheckSession(
  sessionId: string
): Promise<CheckSessionResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const guard = await requireInProgress(supabase, sessionId);
  if ("error" in guard) return { error: guard.error };
  const session = guard.session;

  const [items, { data: entryRows }, deptName] = await Promise.all([
    fetchCheckableItems(supabase, session.department_id as string),
    supabase.from("check_entries").select("*").eq("session_id", sessionId),
    departmentName(supabase, session.department_id as string),
  ]);

  const entries = (entryRows ?? []).map(mapCheckEntry);
  const entryByItem = new Map(entries.map((e) => [e.item_id, e]));
  const unchecked = items.filter((it) => !entryByItem.has(it.id));
  if (entries.length === 0) {
    return { error: "Nothing has been checked yet." };
  }

  const counters = {
    total_items: entries.length + unchecked.length,
    present_count: entries.filter((e) => e.result === "present").length,
    missing_count: entries.filter((e) => e.result === "missing").length,
    issue_count: entries.filter((e) => e.result === "issue").length,
    shortfall_count: entries.filter(isShortfall).length,
    na_count: entries.filter((e) => e.result === "not_applicable").length,
    unchecked_count: unchecked.length,
  };

  const { error } = await supabase
    .from("check_sessions")
    .update({
      status: "completed",
      completed_by: actor.id,
      completed_at: new Date().toISOString(),
      ...counters,
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[checks] complete failed", error);
    return { error: "Couldn't complete the check. Try again." };
  }

  const label = CHECK_TYPE_LABEL[session.session_type as CheckType];
  const activity = await writeAudit(
    supabase,
    actor,
    "Check",
    `${deptName} — ${label} check`,
    `Completed ${label.toLowerCase()} check: ${counters.present_count} present, ` +
      `${counters.missing_count} missing, ${counters.issue_count} with issues, ` +
      `${counters.shortfall_count} short, ${counters.na_count} N/A, ` +
      `${counters.unchecked_count} unchecked of ${counters.total_items} items.`
  );

  if (counters.missing_count > 0 || counters.shortfall_count > 0) {
    const nameOf = new Map(items.map((it) => [it.id, it.item_name]));
    const itemName = (id: string) => nameOf.get(id) ?? "Unknown item";
    after(() =>
      notifyCheckCompleted({
        actorId: actor.id,
        actorName: actor.full_name,
        departmentName: deptName,
        sessionType: session.session_type as CheckType,
        weekStart: session.week_start as string,
        missing: entries
          .filter((e) => e.result === "missing")
          .map((e) => itemName(e.item_id)),
        shortfalls: entries.filter(isShortfall).map((e) => ({
          name: itemName(e.item_id),
          seen: e.quantity_seen,
          expected: e.quantity_expected,
        })),
        issues: entries
          .filter((e) => e.result === "issue")
          .map((e) => itemName(e.item_id)),
      })
    );
  }

  return {
    session: await fetchSessionWithEntries(supabase, sessionId),
    activity,
  };
}

/** Abandon an in-progress session, freeing the week's slot for a redo. */
export async function abandonCheckSession(
  sessionId: string
): Promise<CheckSessionResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const guard = await requireInProgress(supabase, sessionId);
  if ("error" in guard) return { error: guard.error };
  const session = guard.session;

  const { error } = await supabase
    .from("check_sessions")
    .update({ status: "abandoned" })
    .eq("id", sessionId);

  if (error) {
    console.error("[checks] abandon failed", error);
    return { error: "Couldn't abandon the check. Try again." };
  }

  const deptName = await departmentName(
    supabase,
    session.department_id as string
  );
  const label = CHECK_TYPE_LABEL[session.session_type as CheckType];
  const activity = await writeAudit(
    supabase,
    actor,
    "Check",
    `${deptName} — ${label} check`,
    `Abandoned ${label.toLowerCase()} check.`
  );

  return {
    session: await fetchSessionWithEntries(supabase, sessionId),
    activity,
  };
}
