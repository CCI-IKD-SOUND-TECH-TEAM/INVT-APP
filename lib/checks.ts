import { format, startOfWeek, subWeeks } from "date-fns";
import type { CheckEntry, CheckSession, CheckType } from "@/lib/types";

/**
 * Shared helpers for the weekly presence-check domain. Client-safe (no
 * "server-only") — imported by both the server actions (app/actions/checks.ts)
 * and the checks pages/components.
 */

/**
 * The Sunday that opens the week containing `d`, as an ISO date string.
 * Sunday-start matches the service rhythm: the Sunday setup is the first
 * check of the week. Must stay in sync with check_sessions.week_start.
 */
/** Today as `YYYY-MM-DD` — the default for date inputs and export filenames. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekStartIso(d: Date = new Date()): string {
  return format(startOfWeek(d, { weekStartsOn: 0 }), "yyyy-MM-dd");
}

/** Present, but fewer units seen than the item's recorded quantity. */
export function isShortfall(entry: CheckEntry): boolean {
  return entry.result === "present" && entry.quantity_seen < entry.quantity_expected;
}

export const CHECK_TYPE_LABEL: Record<CheckType, string> = {
  setup: "Setup",
  set_down: "Set-down",
};

/**
 * Consecutive fully-checked weeks for a department — both the setup and the
 * set-down completed. The current week counts once it's fully done; an
 * unfinished current week doesn't break the run (counting starts from last
 * week instead). Capped by however many weeks of sessions the caller loaded,
 * so a 12-week query yields at most a 12-week streak.
 */
export function departmentCheckStreak(
  sessions: CheckSession[],
  departmentId: string,
  now: Date = new Date()
): number {
  const typesByWeek = new Map<string, Set<CheckType>>();
  for (const s of sessions) {
    if (s.department_id !== departmentId || s.status !== "completed") continue;
    const types = typesByWeek.get(s.week_start) ?? new Set<CheckType>();
    types.add(s.session_type);
    typesByWeek.set(s.week_start, types);
  }
  const fullyChecked = (week: string) => {
    const types = typesByWeek.get(week);
    return types?.has("setup") === true && types.has("set_down");
  };

  let cursor = now;
  if (!fullyChecked(weekStartIso(cursor))) cursor = subWeeks(cursor, 1);
  let streak = 0;
  while (fullyChecked(weekStartIso(cursor))) {
    streak++;
    cursor = subWeeks(cursor, 1);
  }
  return streak;
}
