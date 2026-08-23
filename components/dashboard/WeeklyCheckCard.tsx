"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconAlertCircleFilled as ExclamationCircleIcon,
  IconCircleCheckFilled as CheckCircleIcon,
  IconCircleDashed as CircleDashedIcon,
  IconLoader2 as LoaderIcon,
  IconPlayerPlay as PlayIcon,
  IconProgress as ProgressIcon,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { checksQuery, departmentItemCountsQuery } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import { useReference } from "@/lib/queries/use-reference";
import { useStartCheckSession } from "@/lib/mutations/checks";
import {
  CHECK_TYPE_LABEL,
  departmentCheckStreak,
  weekStartIso,
} from "@/lib/checks";
import type { CheckSession, CheckType } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CHECK_TYPES: CheckType[] = ["setup", "set_down"];

/* Every row — header included — shares this grid, so the two status columns
   line up down the whole card regardless of how long a cell's label is. */
const ROW_GRID = "grid grid-cols-[1fr_4.75rem_4.75rem] items-center gap-x-2";

/**
 * This week's check status per department × type. Each cell links to the
 * session when one exists; a not-started cell starts one in a single tap and
 * navigates straight into it — the cue and the action are the same control.
 */
export default function WeeklyCheckCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { departments, departmentIdByName } = useReference();
  // Twelve weeks, not one: the grid renders only this week, but the streaks
  // and the checks-caught footer read the history. Shares the checks page's
  // cache entry, and the dashboard server component prefetches it.
  const { data: checkSessions = [] } = useQuery(checksQuery(12));
  // A department with nothing to check can't start a session — its cell links
  // to the checks page, whose empty state explains why.
  const { data: checkableCount = {} } = useQuery(departmentItemCountsQuery());
  const startCheckSession = useStartCheckSession();
  const currentWeek = weekStartIso();

  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startFromCell(
    deptId: string,
    deptName: string,
    type: CheckType
  ) {
    const key = `${deptName}:${type}`;
    setPendingCell(key);
    setError(null);
    try {
      // Race-safe: the action returns the existing session when someone else
      // started this check first, so both taps land in the same walkthrough.
      const session = await startCheckSession.mutateAsync({
        department_id: deptId,
        session_type: type,
      });
      router.push(`/checks/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start that check.");
      // The usual cause is state this card hasn't seen yet (e.g. completed on
      // another device) — refetch so the grid corrects itself.
      queryClient.invalidateQueries({ queryKey: queryKeys.checks.all() });
    }
    setPendingCell(null);
  }

  const cell = (deptId: string | undefined, type: CheckType) =>
    deptId
      ? checkSessions.find(
          (s) =>
            s.department_id === deptId &&
            s.session_type === type &&
            s.week_start === currentWeek &&
            s.status !== "abandoned"
        )
      : undefined;

  // "2 of 6 done this week" — department × type slots for departments that
  // actually have items, against this week's completed sessions.
  const slots = departments.reduce((n, name) => {
    const id = departmentIdByName(name);
    return id && (checkableCount[id] ?? 0) > 0 ? n + CHECK_TYPES.length : n;
  }, 0);
  const doneThisWeek = checkSessions.filter(
    (s) => s.week_start === currentWeek && s.status === "completed"
  ).length;

  // Proof the ritual pays: items the last 12 weeks of checks flagged.
  const caught = checkSessions
    .filter((s) => s.status === "completed")
    .reduce(
      (n, s) =>
        n +
        (s.missing_count ?? 0) +
        (s.issue_count ?? 0) +
        (s.shortfall_count ?? 0),
      0
    );

  return (
    <Card>
      <CardHeader className="mb-1 items-start">
        <div className="flex flex-col gap-0.5">
          <CardTitle>Weekly Checks</CardTitle>
          <span className="text-xs text-ink-faint">
            {slots > 0
              ? `${doneThisWeek} of ${slots} done this week`
              : "This week"}
          </span>
        </div>
        <Link
          href="/checks"
          className="shrink-0 text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-150 hover:text-brand"
        >
          Open Checks
        </Link>
      </CardHeader>

      {/* Column headers print once here instead of inside every cell. */}
      <div className={cn(ROW_GRID, "px-3 pb-1.5")}>
        <span />
        {CHECK_TYPES.map((type) => (
          <span key={type} className="h-label text-center">
            {CHECK_TYPE_LABEL[type]}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {departments.map((deptName) => {
          const deptId = departmentIdByName(deptName);
          const canStart = deptId ? (checkableCount[deptId] ?? 0) > 0 : false;
          // The streak is the reward leg of the habit loop: consecutive fully
          // checked weeks, shown once there are two to point at.
          const streak = deptId
            ? departmentCheckStreak(checkSessions, deptId)
            : 0;
          return (
            <div
              key={deptName}
              className={cn(
                ROW_GRID,
                "rounded-md border border-line-subtle bg-popover px-3 py-2"
              )}
            >
              <span className="min-w-0 truncate text-sm font-bold">
                {deptName}
                {streak >= 2 && (
                  <span
                    className="ml-1.5 text-[0.6875rem] font-bold text-status-good"
                    title={`${streak} weeks in a row fully checked`}
                  >
                    {streak}w ✓
                  </span>
                )}
              </span>
              {CHECK_TYPES.map((type) => (
                <CheckCell
                  key={type}
                  type={type}
                  deptName={deptName}
                  session={cell(deptId, type)}
                  canStart={canStart}
                  pending={pendingCell === `${deptName}:${type}`}
                  onStart={
                    deptId
                      ? () => startFromCell(deptId, deptName, type)
                      : undefined
                  }
                />
              ))}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="rounded-md border border-brand-deep bg-brand-tint px-2.5 py-1.5 text-xs text-brand">
          {error}
        </p>
      )}

      {caught > 0 && (
        <p className="text-xs text-ink-faint">
          Checks caught {caught} {caught === 1 ? "item" : "items"} needing
          follow-up in the last 12 weeks.
        </p>
      )}
    </Card>
  );
}

type CellState = {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  /** Fits the 4.75rem column on one line. */
  short: string;
  /** Full wording — title tooltip + screen readers, so glyph is never alone. */
  full: string;
};

function cellState(session: CheckSession | undefined): CellState {
  if (session?.status === "in_progress") {
    return {
      icon: ProgressIcon,
      tone: "text-status-neutral",
      short: "Active",
      full: "In progress",
    };
  }

  if (session?.status === "completed") {
    const flagged =
      (session.missing_count ?? 0) + (session.shortfall_count ?? 0);
    if (flagged > 0) {
      return {
        icon: ExclamationCircleIcon,
        tone: "text-status-critical",
        short: String(flagged),
        full: `${flagged} flagged`,
      };
    }

    const unchecked = session.unchecked_count ?? 0;
    if (unchecked > 0) {
      return {
        icon: CircleDashedIcon,
        tone: "text-status-caution",
        short: String(unchecked),
        full: `${unchecked} unchecked`,
      };
    }

    return {
      icon: CheckCircleIcon,
      tone: "text-status-good",
      short: "Done",
      full: "Done",
    };
  }

  return {
    icon: CircleDashedIcon,
    tone: "text-ink-faint",
    short: "—",
    full: "Not started",
  };
}

const CELL_CLASS =
  /* No resting border — hover carries the affordance, and the hue lives
     on the icon so the label stays neutral (DESIGN.md §180). */
  "flex items-center justify-center gap-1.5 rounded-sm py-1 transition-colors duration-150 hover:bg-secondary";

function CheckCell({
  type,
  deptName,
  session,
  canStart,
  pending,
  onStart,
}: {
  type: CheckType;
  deptName: string;
  session: CheckSession | undefined;
  canStart: boolean;
  pending: boolean;
  onStart?: () => void;
}) {
  // Not started, and startable: the cell IS the start button — one tap
  // creates the session and lands in the walkthrough, no detour via /checks.
  if (!session && canStart && onStart) {
    const label = `${deptName} ${CHECK_TYPE_LABEL[type]}: not started — start now`;
    return (
      <button
        type="button"
        onClick={onStart}
        disabled={pending}
        title={label}
        aria-label={label}
        aria-busy={pending || undefined}
        className={cn(CELL_CLASS, "disabled:opacity-60")}
      >
        {pending ? (
          <LoaderIcon className="size-3.5 shrink-0 animate-spin text-brand" />
        ) : (
          <PlayIcon className="size-3.5 shrink-0 text-brand" />
        )}
        <span className="text-xs font-bold leading-tight">Start</span>
      </button>
    );
  }

  const { icon: Icon, tone, short, full } = cellState(session);
  const label = `${deptName} ${CHECK_TYPE_LABEL[type]}: ${full}`;

  return (
    <Link
      href={session ? `/checks/${session.id}` : "/checks"}
      title={label}
      aria-label={label}
      className={CELL_CLASS}
    >
      <Icon className={cn("size-3.5 shrink-0", tone)} />
      <span className="text-xs font-bold leading-tight tabular-nums">
        {short}
      </span>
    </Link>
  );
}
