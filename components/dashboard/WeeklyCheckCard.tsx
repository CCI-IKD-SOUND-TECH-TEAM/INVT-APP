"use client";

import Link from "next/link";
import {
  IconAlertCircleFilled as ExclamationCircleIcon,
  IconCircleCheckFilled as CheckCircleIcon,
  IconCircleDashed as CircleDashedIcon,
  IconLoader2 as LoaderIcon,
  IconPlayerPlay as PlayIcon,
  IconProgress as ProgressIcon,
} from "@tabler/icons-react";
import { useWeekCheckSlots } from "@/lib/queries/use-week-check-slots";
import type { CheckSlot } from "@/lib/queries/use-week-check-slots";
import { useStartCheck, slotKey } from "@/components/dashboard/use-start-check";
import { CHECK_TYPE_LABEL, departmentCheckStreak } from "@/lib/checks";
import type { CheckSession, CheckType } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const CHECK_TYPES: CheckType[] = ["setup", "set_down"];

/* Every row — header included — shares this grid, so the status columns line
   up down the whole card regardless of how long a cell's label is. The size
   column appears from md: up, where the card is wide enough that the statuses
   would otherwise be marooned at the far edge; a hidden grid child occupies no
   cell, so the narrow layout is a clean three columns. */
const ROW_GRID =
  "grid grid-cols-[1fr_4.75rem_4.75rem] items-center gap-x-2 md:grid-cols-[1fr_auto_4.75rem_4.75rem] md:gap-x-4";

/**
 * This week's check status per department × type. Each cell links to the
 * session when one exists; a not-started cell starts one in a single tap and
 * navigates straight into it — the cue and the action are the same control.
 *
 * The slot maths and the start flow both come from shared hooks, so the
 * dashboard header's "Start check" button and these cells can't disagree
 * about what's outstanding.
 */
export default function WeeklyCheckCard() {
  const { slots, done, sessions, checkableCount } = useWeekCheckSlots();
  const { start, pendingKey, error } = useStartCheck();

  // One row per department, its two type cells beside it.
  const byDepartment = slots.reduce<Map<string, CheckSlot[]>>((acc, slot) => {
    const list = acc.get(slot.deptName) ?? [];
    list.push(slot);
    acc.set(slot.deptName, list);
    return acc;
  }, new Map());

  // Proof the ritual pays: items the last 12 weeks of checks flagged.
  const caught = sessions
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
        <CardTitle>This week&apos;s checks</CardTitle>
        <Link
          href="/checks"
          className="shrink-0 text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-160 ease-out-quart hover:text-brand"
        >
          Open checks
        </Link>
      </CardHeader>

      {slots.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-ink-faint">
            {done} of {slots.length} done
          </span>
          <Progress
            value={(done / slots.length) * 100}
            aria-label={`${done} of ${slots.length} checks done this week`}
          />
        </div>
      )}

      {/* Column headers print once here instead of inside every cell. */}
      <div className={cn(ROW_GRID, "px-1 pb-1")}>
        <span />
        <span className="hidden h-label text-right md:block">To check</span>
        {CHECK_TYPES.map((type) => (
          <span key={type} className="h-label text-center">
            {CHECK_TYPE_LABEL[type]}
          </span>
        ))}
      </div>

      {/* Hairline dividers, not bordered tiles — a row inside a card doesn't
          need its own container to read as a row. */}
      <div className="divide-y divide-line-subtle">
        {[...byDepartment.entries()].map(([deptName, deptSlots]) => {
          // The streak is the reward leg of the habit loop: consecutive fully
          // checked weeks, shown once there are two to point at.
          const streak = departmentCheckStreak(sessions, deptSlots[0].deptId);
          const itemCount = checkableCount[deptSlots[0].deptId] ?? 0;
          return (
            <div key={deptName} className={cn(ROW_GRID, "px-1 py-1.5")}>
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
              {/* How big the check is, before you commit to starting it. */}
              <span className="hidden whitespace-nowrap text-xs tabular-nums text-ink-faint md:block md:text-right">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
              {deptSlots.map((slot) => (
                <CheckCell
                  key={slot.type}
                  slot={slot}
                  pending={pendingKey === slotKey(slot)}
                  onStart={() => start(slot)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {slots.length === 0 && (
        <p className="py-6 text-center text-[0.8125rem] text-ink-faint">
          No department has items to check yet.
        </p>
      )}

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
     on the icon so the label stays neutral (DESIGN.md §180). min-h-10:
     this is the single-tap "start check" control — was ~24px tall, under
     the "generous touch targets" DESIGN.md itself promises. */
  "flex min-h-10 items-center justify-center gap-1.5 rounded-sm py-1 transition-colors duration-160 ease-out-quart hover:bg-secondary";

function CheckCell({
  slot,
  pending,
  onStart,
}: {
  slot: CheckSlot;
  pending: boolean;
  onStart: () => void;
}) {
  const { session, deptName, type } = slot;

  // Not started: the cell IS the start button — one tap creates the session
  // and lands in the walkthrough, no detour via /checks.
  if (!session) {
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
      href={`/checks/${session.id}`}
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
