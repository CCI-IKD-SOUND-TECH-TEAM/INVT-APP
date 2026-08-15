import { format, startOfWeek } from "date-fns";
import type { CheckEntry, CheckType } from "@/lib/types";

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
