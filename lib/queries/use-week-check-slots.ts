"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { checksQuery, departmentItemCountsQuery } from "@/lib/queries";
import { useReference } from "@/lib/queries/use-reference";
import { weekStartIso } from "@/lib/checks";
import type { CheckSession, CheckType } from "@/lib/types";

/**
 * This week's check slots — one per department × type — in one place.
 *
 * The dashboard used to compute this twice: DashboardClient counted the
 * not-started slots for the attention strip while WeeklyCheckCard derived the
 * same set again for its grid. Two copies of "which checks are outstanding"
 * is one divergence away from the header and the card disagreeing.
 *
 * Every query below is already prefetched by the dashboard and checks pages
 * and shares their cache entries, so this hook costs no extra requests.
 */

const CHECK_TYPES: CheckType[] = ["setup", "set_down"];

export interface CheckSlot {
  deptId: string;
  deptName: string;
  type: CheckType;
  /** This week's session for the slot, if one has been started. */
  session?: CheckSession;
}

export interface WeekCheckSlots {
  /** Every slot for departments that actually have something to check. */
  slots: CheckSlot[];
  /** The subset with no session yet — what the header offers to start. */
  notStarted: CheckSlot[];
  /** Completed this week, against `slots.length`. */
  done: number;
  /** Twelve weeks of history — the streak calculations read it. */
  sessions: CheckSession[];
  currentWeek: string;
  checkableCount: Record<string, number>;
}

export function useWeekCheckSlots(): WeekCheckSlots {
  const { departments, departmentIdByName } = useReference();
  // Twelve weeks, not one: only this week is rendered as slots, but the
  // streaks and the "checks caught N items" footer read the history.
  const { data: sessions = [] } = useQuery(checksQuery(12));
  // A department with nothing to check can't start a session, so it gets no
  // slots at all rather than a row that fails on tap.
  const { data: checkableCount = {} } = useQuery(departmentItemCountsQuery());
  const currentWeek = weekStartIso();

  return useMemo(() => {
    const slots: CheckSlot[] = [];

    for (const deptName of departments) {
      const deptId = departmentIdByName(deptName);
      if (!deptId || (checkableCount[deptId] ?? 0) === 0) continue;

      for (const type of CHECK_TYPES) {
        slots.push({
          deptId,
          deptName,
          type,
          // An abandoned session leaves the slot open — the same predicate
          // the start action uses when it decides whether to reuse one.
          session: sessions.find(
            (s) =>
              s.department_id === deptId &&
              s.session_type === type &&
              s.week_start === currentWeek &&
              s.status !== "abandoned"
          ),
        });
      }
    }

    return {
      slots,
      notStarted: slots.filter((s) => !s.session),
      done: slots.filter((s) => s.session?.status === "completed").length,
      sessions,
      currentWeek,
      checkableCount,
    };
  }, [departments, departmentIdByName, checkableCount, sessions, currentWeek]);
}
