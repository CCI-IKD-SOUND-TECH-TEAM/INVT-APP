"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { CHECK_TYPE_LABEL, weekStartIso } from "@/lib/checks";
import type { CheckSession, CheckType } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CHECK_TYPES: CheckType[] = ["setup", "set_down"];

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
          className="shrink-0 text-[0.8125rem] font-bold text-brand hover:text-brand-deep"
        >
          Open Checks
        </Link>
      </CardHeader>

      <div className="flex flex-col gap-2">
        {departments.map((deptName) => {
          const deptId = departmentIdByName(deptName);
          return (
            <div
              key={deptName}
              className="flex items-center justify-between gap-3 rounded-md border border-line-subtle bg-popover px-3 py-2.5"
            >
              <span className="text-sm font-bold">{deptName}</span>
              <span className="flex gap-2">
                {CHECK_TYPES.map((type) => (
                  <CellBadge
                    key={type}
                    type={type}
                    session={cell(deptId, type)}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CellBadge({
  type,
  session,
}: {
  type: CheckType;
  session: CheckSession | undefined;
}) {
  const label = CHECK_TYPE_LABEL[type];

  let tone = "text-ink-faint border-line-subtle";
  let detail = "—";
  if (session?.status === "in_progress") {
    tone = "text-status-info border-status-info/40";
    detail = "In progress";
  } else if (session?.status === "completed") {
    const flagged =
      (session.missing_count ?? 0) > 0 || (session.shortfall_count ?? 0) > 0;
    const partial = (session.unchecked_count ?? 0) > 0;
    tone = flagged
      ? "text-status-critical border-status-critical/40"
      : partial
        ? "text-status-caution border-status-caution/40"
        : "text-status-good border-status-good/40";
    detail = flagged
      ? `${(session.missing_count ?? 0) + (session.shortfall_count ?? 0)} flagged`
      : partial
        ? `${session.unchecked_count} unchecked`
        : "Done";
  }

  return (
    <Link
      href={session ? `/checks/${session.id}` : "/checks"}
      className={cn(
        "flex flex-col items-end rounded-md border px-2 py-1 transition-colors duration-150 hover:border-border",
        tone
      )}
    >
      <span className="text-[0.6875rem] uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </span>
      <span className="text-xs font-bold leading-tight">{detail}</span>
    </Link>
  );
}
