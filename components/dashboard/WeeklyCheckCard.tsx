"use client";

import Link from "next/link";
import {
  IconAlertCircleFilled as ExclamationCircleIcon,
  IconCircleCheckFilled as CheckCircleIcon,
  IconCircleDashed as CircleDashedIcon,
  IconProgress as ProgressIcon,
} from "@tabler/icons-react";
import { useStore } from "@/lib/store";
import { CHECK_TYPE_LABEL, weekStartIso } from "@/lib/checks";
import type { CheckSession, CheckType } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CHECK_TYPES: CheckType[] = ["setup", "set_down"];

/* Every row — header included — shares this grid, so the two status columns
   line up down the whole card regardless of how long a cell's label is. */
const ROW_GRID = "grid grid-cols-[1fr_4.75rem_4.75rem] items-center gap-x-2";

/**
 * This week's check status per department × type. Each cell links to the
 * session when one exists, otherwise to the checks landing page.
 */
export default function WeeklyCheckCard() {
  const { departments, departmentIdByName, checkSessions } = useStore();
  const currentWeek = weekStartIso();

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

  return (
    <Card>
      <CardHeader className="mb-1 items-start">
        <div className="flex flex-col gap-0.5">
          <CardTitle>Weekly Checks</CardTitle>
          <span className="text-xs text-ink-faint">This week</span>
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
          return (
            <div
              key={deptName}
              className={cn(
                ROW_GRID,
                "rounded-md border border-line-subtle bg-popover px-3 py-2"
              )}
            >
              <span className="text-sm font-bold">{deptName}</span>
              {CHECK_TYPES.map((type) => (
                <CheckCell
                  key={type}
                  type={type}
                  deptName={deptName}
                  session={cell(deptId, type)}
                />
              ))}
            </div>
          );
        })}
      </div>
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

function CheckCell({
  type,
  deptName,
  session,
}: {
  type: CheckType;
  deptName: string;
  session: CheckSession | undefined;
}) {
  const { icon: Icon, tone, short, full } = cellState(session);
  const label = `${deptName} ${CHECK_TYPE_LABEL[type]}: ${full}`;

  return (
    <Link
      href={session ? `/checks/${session.id}` : "/checks"}
      title={label}
      aria-label={label}
      /* No resting border — hover carries the affordance, and the hue lives
         on the icon so the label stays neutral (DESIGN.md §180). */
      className="flex items-center justify-center gap-1.5 rounded-sm py-1 transition-colors duration-150 hover:bg-secondary"
    >
      <Icon className={cn("size-3.5 shrink-0", tone)} />
      <span className="text-xs font-bold leading-tight tabular-nums">
        {short}
      </span>
    </Link>
  );
}
