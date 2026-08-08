"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import { CHECK_TYPE_LABEL, weekStartIso } from "@/lib/checks";
import type { CheckSession, CheckType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconAlertTriangle as ExclamationTriangleIcon,
  IconArchive as ArchiveBoxIcon,
  IconChevronRight as ChevronRightIcon,
  IconCircleCheck as CheckCircleIcon,
  IconPlayerPlay as PlayIcon,
  IconPackageExport as SetupIcon,
  IconPackageImport as SetDownIcon,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const CHECK_TYPES: CheckType[] = ["setup", "set_down"];

const CHECK_TYPE_HINT: Record<CheckType, string> = {
  setup: "Before service starts",
  set_down: "After everything's packed away",
};

function fmtWeek(weekStart: string) {
  return `Week of ${format(parseISO(weekStart), "EEE d MMM")}`;
}

/** "3 present · 1 missing · 2 issues · 1 short · 1 N/A" from a completed session. */
function summaryText(s: CheckSession): string {
  const parts = [`${s.present_count ?? 0} present`];
  if (s.missing_count) parts.push(`${s.missing_count} missing`);
  if (s.issue_count)
    parts.push(`${s.issue_count} ${s.issue_count === 1 ? "issue" : "issues"}`);
  if (s.shortfall_count) parts.push(`${s.shortfall_count} short`);
  if (s.na_count) parts.push(`${s.na_count} N/A`);
  if (s.unchecked_count) parts.push(`${s.unchecked_count} unchecked`);
  return parts.join(" · ");
}

function TabCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-popover px-1.5 py-px text-[0.6875rem] text-muted-foreground group-data-[state=active]:bg-brand-tint group-data-[state=active]:text-brand">
      {children}
    </span>
  );
}

export default function ChecksPage() {
  return (
    <Suspense fallback={null}>
      <ChecksContent />
    </Suspense>
  );
}

function ChecksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    departments,
    departmentIdByName,
    items,
    checkSessions,
    startCheckSession,
    abandonCheckSession,
    profileName,
  } = useStore();

  const currentWeek = weekStartIso();
  // Which (dept, type) cell has an action in flight, e.g. "Sound:setup".
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkableCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      if (it.status === "Retired") continue;
      counts.set(it.department_id, (counts.get(it.department_id) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const defaultTab = useMemo(() => {
    const fromUrl = searchParams.get("dept");
    if (fromUrl && departments.includes(fromUrl)) return fromUrl;
    const withItems = departments.find((name) => {
      const id = departmentIdByName(name);
      return id ? (checkableCount.get(id) ?? 0) > 0 : false;
    });
    return withItems ?? departments[0];
  }, [searchParams, departments, departmentIdByName, checkableCount]);

  const [tab, setTab] = useState<string | undefined>(undefined);
  const activeTab = tab ?? defaultTab;

  function changeTab(name: string) {
    setTab(name);
    router.replace(`/checks?dept=${encodeURIComponent(name)}`, {
      scroll: false,
    });
  }

  const thisWeekSession = (deptId: string, type: CheckType) =>
    checkSessions.find(
      (s) =>
        s.department_id === deptId &&
        s.session_type === type &&
        s.week_start === currentWeek &&
        s.status !== "abandoned"
    );

  const staleSessions = useMemo(
    () =>
      checkSessions.filter(
        (s) => s.status === "in_progress" && s.week_start !== currentWeek
      ),
    [checkSessions, currentWeek]
  );

  const pastByDept = useMemo(() => {
    const map = new Map<string, CheckSession[]>();
    for (const s of checkSessions) {
      // Abandoned sessions are hidden — the audit log keeps their record.
      if (s.status !== "completed") continue;
      const list = map.get(s.department_id) ?? [];
      list.push(s);
      map.set(s.department_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.week_start.localeCompare(a.week_start));
    }
    return map;
  }, [checkSessions]);

  async function start(deptId: string, deptName: string, type: CheckType) {
    const key = `${deptName}:${type}`;
    setPendingCell(key);
    setError(null);
    const res = await startCheckSession(deptId, type);
    setPendingCell(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(`/checks/${res.id}`);
  }

  async function abandonStale(sessionId: string) {
    setPendingCell(`abandon:${sessionId}`);
    setError(null);
    const res = await abandonCheckSession(sessionId);
    setPendingCell(null);
    if ("error" in res) setError(res.error);
  }

  /**
   * The one check that deserves the red button in this department:
   * an in-progress session wins, otherwise Setup before Set-down.
   * Returns null when both checks are completed.
   */
  function nextCheckType(deptId: string): CheckType | null {
    const setup = thisWeekSession(deptId, "setup");
    const setDown = thisWeekSession(deptId, "set_down");
    if (setup?.status === "in_progress") return "setup";
    if (setDown?.status === "in_progress") return "set_down";
    if (!setup) return "setup";
    if (!setDown) return "set_down";
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-muted-foreground">
          Confirm every item is where it should be — once at setup, once at
          set-down.
        </p>
        <span className="text-sm font-bold whitespace-nowrap">
          {fmtWeek(currentWeek)}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-brand-deep bg-brand-tint px-3 py-2 text-sm text-brand">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tour anchor lives on the Tabs root, not a Start button — the
          buttons are conditional (all-done / no-items / stale states). */}
      <Tabs
        value={activeTab}
        onValueChange={changeTab}
        className="gap-6"
        data-tour="start-check"
      >
        {/* Three department tabs can exceed 390px; let them scroll rather
            than widen the page. Bleeds to the edges so the last tab clears
            the page padding. */}
        <TabsList className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:max-w-none md:px-0 [&::-webkit-scrollbar]:hidden">
          {departments.map((deptName) => {
            const deptId = departmentIdByName(deptName);
            const count = deptId ? (checkableCount.get(deptId) ?? 0) : 0;
            const hasStale =
              deptId != null &&
              staleSessions.some((s) => s.department_id === deptId);
            return (
              <TabsTrigger key={deptName} value={deptName} className="group">
                {deptName}
                {count > 0 && <TabCount>{count}</TabCount>}
                {hasStale && (
                  <span
                    className="size-1.5 rounded-full bg-status-caution"
                    aria-label="Has an unfinished check"
                  />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {departments.map((deptName) => {
          const deptId = departmentIdByName(deptName);
          if (!deptId) return null;
          const total = checkableCount.get(deptId) ?? 0;
          const deptStale = staleSessions.filter(
            (s) => s.department_id === deptId
          );
          const past = pastByDept.get(deptId) ?? [];
          const next = nextCheckType(deptId);

          return (
            <TabsContent
              key={deptName}
              value={deptName}
              className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
            >
              {deptStale.length > 0 && (
                <div className="flex flex-col gap-2 rounded-md border border-status-caution/40 bg-status-caution/10 px-3 py-2.5">
                  {deptStale.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <ExclamationTriangleIcon className="size-4 shrink-0 text-status-caution" />
                      <span>
                        Unfinished check: the{" "}
                        {CHECK_TYPE_LABEL[s.session_type].toLowerCase()} from{" "}
                        {fmtWeek(s.week_start).toLowerCase()}.
                      </span>
                      <span className="ml-auto flex gap-2">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/checks/${s.id}`}>Resume</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={pendingCell === `abandon:${s.id}`}
                          onClick={() => abandonStale(s.id)}
                        >
                          Abandon
                        </Button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {total === 0 ? (
                <div className="flex max-w-4xl flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-12 text-center">
                  <ArchiveBoxIcon className="size-8 text-ink-faint" />
                  <div className="flex flex-col gap-1">
                    <p className="font-bold">Nothing to check yet</p>
                    <p className="text-sm text-muted-foreground">
                      {deptName} has no active inventory. Add items first —
                      they&apos;ll show up here for weekly checks.
                    </p>
                  </div>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/inventory">Go to Inventory</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex max-w-4xl flex-col gap-3">
                  {next === null && (
                    <p className="flex items-center gap-2 text-sm text-status-good">
                      <CheckCircleIcon className="size-4 shrink-0" />
                      All done for this week.
                    </p>
                  )}
                  <Card className="gap-0 p-3.5 md:p-5">
                    {CHECK_TYPES.map((type, i) => {
                      const session = thisWeekSession(deptId, type);
                      const key = `${deptName}:${type}`;
                      const label = CHECK_TYPE_LABEL[type];
                      const isNext = next === type;
                      const TypeIcon = type === "setup" ? SetupIcon : SetDownIcon;
                      const missing = (session?.missing_count ?? 0) > 0;
                      const setupDone =
                        thisWeekSession(deptId, "setup")?.status === "completed";

                      return (
                        <Fragment key={type}>
                          {i > 0 && (
                            <div
                              aria-hidden
                              className={cn(
                                "ml-[19.5px] h-5 w-px",
                                setupDone ? "bg-status-good/50" : "bg-border"
                              )}
                            />
                          )}
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                            <span
                              aria-hidden
                              className={cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-full",
                                !session && "border border-border text-ink-faint",
                                session?.status === "in_progress" &&
                                  "bg-status-caution/15 text-status-caution",
                                session?.status === "completed" &&
                                  (missing
                                    ? "bg-status-critical/15 text-status-critical"
                                    : "bg-status-good/15 text-status-good")
                              )}
                            >
                              <TypeIcon className="size-5" />
                            </span>

                            {/* 144px fixed + shrink-0 blew past a 390px
                                viewport; below sm: it takes the rest of the
                                row and the status line wraps beneath. */}
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:w-36 sm:flex-none sm:shrink-0">
                              <h3 className="h-title">{label}</h3>
                              <span className="text-xs text-muted-foreground">
                                {CHECK_TYPE_HINT[type]}
                              </span>
                            </div>

                            <div className="flex w-full min-w-0 items-center gap-2.5 sm:w-auto sm:flex-1">
                              {!session && (
                                <span className="text-sm text-ink-faint">
                                  Not started
                                </span>
                              )}
                              {session?.status === "in_progress" && (
                                <>
                                  <span className="text-sm text-muted-foreground">
                                    {session.entries.length} of {total} checked
                                  </span>
                                  <Progress
                                    value={
                                      (session.entries.length / total) * 100
                                    }
                                    className="min-w-0 flex-1 sm:w-32 sm:flex-none sm:shrink-0"
                                  />
                                </>
                              )}
                              {session?.status === "completed" && (
                                <span
                                  className={cn(
                                    "truncate text-sm",
                                    missing
                                      ? "text-status-critical"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {summaryText(session)}
                                </span>
                              )}
                            </div>

                            <div className="ml-auto">
                              {!session && (
                                <Button
                                  size="sm"
                                  variant={isNext ? "default" : "secondary"}
                                  loading={pendingCell === key}
                                  onClick={() => start(deptId, deptName, type)}
                                >
                                  <PlayIcon className="size-3.5" /> Start
                                </Button>
                              )}
                              {session?.status === "in_progress" && (
                                <Button
                                  asChild
                                  size="sm"
                                  variant={isNext ? "default" : "secondary"}
                                >
                                  <Link href={`/checks/${session.id}`}>
                                    Resume
                                  </Link>
                                </Button>
                              )}
                              {session?.status === "completed" && (
                                <Button asChild size="sm" variant="ghost">
                                  <Link href={`/checks/${session.id}`}>
                                    View{" "}
                                    <ChevronRightIcon className="size-3.5" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </Fragment>
                      );
                    })}
                  </Card>
                </div>
              )}

              <section className="flex flex-col gap-3">
                <h2 className="h-title">Past checks</h2>
                {past.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    Completed {deptName} checks will show up here.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Week</TableHead>
                          <TableHead>Check</TableHead>
                          <TableHead>Completed by</TableHead>
                          <TableHead>Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {past.map((s) => (
                          <TableRow
                            key={s.id}
                            className="cursor-pointer"
                            onClick={() => router.push(`/checks/${s.id}`)}
                          >
                            <TableCell>
                              {format(parseISO(s.week_start), "d MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              {CHECK_TYPE_LABEL[s.session_type]}
                            </TableCell>
                            <TableCell>
                              {s.completed_by
                                ? profileName(s.completed_by)
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  (s.missing_count ?? 0) > 0 &&
                                    "text-status-critical"
                                )}
                              >
                                {summaryText(s)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
