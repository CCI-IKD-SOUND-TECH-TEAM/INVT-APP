"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  checkSessionQuery,
  checksQuery,
  itemsByDepartmentQuery,
} from "@/lib/queries";
import { useReference } from "@/lib/queries/use-reference";
import {
  useAbandonCheckSession,
  useBulkMarkRemainingPresent,
  useCompleteCheckSession,
  useRecordCheckEntry,
} from "@/lib/mutations/checks";
import type { ItemListRow } from "@/lib/api-types";
import { CHECK_TYPE_LABEL, isShortfall, weekStartIso } from "@/lib/checks";
import type { CheckEntry, CheckResult, CheckSession, } from "@/lib/types";
import CheckItemRow from "@/components/checks/CheckItemRow";
import CheckResultBadge from "@/components/checks/CheckResultBadge";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  IconAlertTriangle as ExclamationTriangleIcon,
  IconArrowLeft as ArrowLeftIcon,
  IconClipboardCheck as ClipboardDocumentCheckIcon,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export default function CheckSessionClient() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: session, isPending } = useQuery(checkSessionQuery(sessionId));

  // Distinguish "still loading" from "no such session" — the store had every
  // session in memory, so absence used to be conclusive. It isn't now.
  if (isPending) return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-4 py-16 text-center">
        <ClipboardDocumentCheckIcon className="size-10 text-ink-faint" />
        <h2 className="h-headline">Check not found</h2>
        <p className="text-muted-foreground">
          This check may be older than the 12 weeks of history loaded here.
        </p>
        <Button asChild variant="secondary">
          <Link href="/checks">
            <ArrowLeftIcon className="size-4" /> Back to Weekly Checks
          </Link>
        </Button>
      </div>
    );
  }

  return session.status === "in_progress" ? (
    <WalkthroughView session={session} />
  ) : (
    <SummaryView session={session} />
  );
}

/* ------------------------------------------------------------------------- */
/* In-progress walkthrough                                                    */
/* ------------------------------------------------------------------------- */

function WalkthroughView({ session }: { session: CheckSession }) {
  const router = useRouter();
  const { departmentName } = useReference();

  // Just this department's non-retired items, already sorted by the server.
  const { data: items = [] } = useQuery(
    itemsByDepartmentQuery(session.department_id)
  );
  // Only read for the set-down diff below; shares its cache entry with the
  // checks list page.
  const { data: checkSessions = [] } = useQuery(checksQuery(12));

  const recordCheckEntry = useRecordCheckEntry();
  const bulkMarkRemainingPresent = useBulkMarkRemainingPresent();
  const completeCheckSession = useCompleteCheckSession();
  const abandonCheckSession = useAbandonCheckSession();

  const [error, setError] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [busy, setBusy] = useState(false);

  const label = CHECK_TYPE_LABEL[session.session_type];
  const deptName = departmentName(session.department_id);

  // The checkable list is the LIVE set of non-retired department items, so an
  // item created or retired mid-session reflects immediately.
  // The endpoint already scopes to the department and excludes retired items.
  const checkable = useMemo(
    () => [...items].sort((a, b) => a.item_name.localeCompare(b.item_name)),
    [items]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ItemListRow[]>();
    for (const it of checkable) {
      const cat = it.category_name;
      const list = map.get(cat);
      if (list) list.push(it);
      else map.set(cat, [it]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [checkable]);

  const entryByItem = useMemo(
    () => new Map(session.entries.map((e) => [e.item_id, e])),
    [session.entries]
  );

  // Set-down diff: this week's setup session for the same department.
  const isSetDown = session.session_type === "set_down";
  const setupEntryByItem = useMemo(() => {
    if (!isSetDown) return undefined;
    const setup = checkSessions.find(
      (s) =>
        s.department_id === session.department_id &&
        s.session_type === "setup" &&
        s.week_start === session.week_start &&
        s.status !== "abandoned"
    );
    if (!setup) return undefined;
    return new Map(setup.entries.map((e) => [e.item_id, e]));
  }, [isSetDown, checkSessions, session.department_id, session.week_start]);

  const checkedCount = checkable.filter((it) => entryByItem.has(it.id)).length;
  const remaining = checkable.length - checkedCount;
  const missing = session.entries.filter((e) => e.result === "missing");
  const issues = session.entries.filter((e) => e.result === "issue");
  const shortfalls = session.entries.filter(isShortfall);
  const notApplicable = session.entries.filter(
    (e) => e.result === "not_applicable"
  );
  const uncheckedItems = checkable.filter((it) => !entryByItem.has(it.id));
  const itemName = (id: string) =>
    items.find((it) => it.id === id)?.item_name ?? "Unknown item";

  const record = async (
    itemId: string,
    result: CheckResult,
    quantitySeen?: number
  ) => {
    setError(null);
    try {
      await recordCheckEntry.mutateAsync({
        session_id: session.id,
        item_id: itemId,
        result,
        quantity_seen: quantitySeen,
        // Feeds the optimistic row so the stepper shows a sane expected value
        // before the server round trip lands.
        quantity_expected: items.find((it) => it.id === itemId)?.quantity ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record that.");
    }
  };

  const bulkMark = async () => {
    setBusy(true);
    setError(null);
    try {
      await bulkMarkRemainingPresent.mutateAsync(session.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark the rest.");
    }
    setBusy(false);
    setConfirmBulk(false);
  };

  const complete = async () => {
    setBusy(true);
    setError(null);
    try {
      await completeCheckSession.mutateAsync(session.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete the check.");
    }
    setBusy(false);
    setConfirmComplete(false);
  };

  const abandon = async () => {
    setBusy(true);
    setError(null);
    try {
      await abandonCheckSession.mutateAsync(session.id);
    } catch (e) {
      setBusy(false);
      setConfirmAbandon(false);
      setError(e instanceof Error ? e.message : "Could not abandon the check.");
      return;
    }
    setBusy(false);
    setConfirmAbandon(false);
    router.push("/checks");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky progress header — below the 14-high site header. */}
      <div className="sticky top-14 z-10 -mx-4 flex flex-col gap-2 border-b border-line-subtle bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button asChild size="icon-sm" variant="ghost" aria-label="Back">
              <Link href="/checks">
                <ArrowLeftIcon className="size-4" />
              </Link>
            </Button>
            <span className="font-bold">
              {deptName} — {label}
            </span>
            <span className="text-sm text-ink-faint">
              {format(parseISO(session.week_start), "d MMM")}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {checkedCount} of {checkable.length} checked
          </span>
        </div>
        <Progress
          value={checkable.length > 0 ? (checkedCount / checkable.length) * 100 : 0}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-brand-deep bg-brand-tint px-3 py-2 text-sm text-brand">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {checkable.length === 0 ? (
        <p className="text-muted-foreground">
          No checkable items left in this department.
        </p>
      ) : (
        grouped.map(([cat, catItems]) => (
          <section key={cat} className="flex flex-col gap-1.5">
            <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.04em] text-ink-faint">
              {cat}
            </h2>
            <div className="rounded-lg border border-border bg-card">
              {catItems.map((it) => (
                <CheckItemRow
                  key={it.id}
                  item={it}
                  entry={entryByItem.get(it.id)}
                  setupEntry={setupEntryByItem?.get(it.id)}
                  showSetupDiff={isSetDown && setupEntryByItem !== undefined}
                  onRecord={(result, qty) => record(it.id, result, qty)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Sticky action footer */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line-subtle bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-status-neutral"
            onClick={() => setConfirmAbandon(true)}
          >
            Abandon
          </Button>
          <div className="flex gap-2">
            {remaining > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmBulk(true)}
              >
                Mark remaining present ({remaining})
              </Button>
            )}
            <Button
              size="sm"
              disabled={checkedCount === 0}
              onClick={() => setConfirmComplete(true)}
            >
              Complete check
            </Button>
          </div>
        </div>
      </div>

      {confirmBulk && (
        <Modal title="Mark remaining present" wide onClose={() => setConfirmBulk(false)}>
          <p className="text-sm text-muted-foreground">
            Mark the {remaining} unchecked{" "}
            {remaining === 1 ? "item" : "items"} as present at full quantity?
            Items someone else marks in the meantime keep their result.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmBulk(false)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={bulkMark}>
              Mark {remaining} present
            </Button>
          </div>
        </Modal>
      )}

      {confirmComplete && (
        <Modal title={`Complete ${label.toLowerCase()} check`} wide onClose={() => setConfirmComplete(false)}>
          <div className="flex flex-col gap-3">
            {remaining > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-status-caution/40 bg-status-caution/10 px-3 py-2.5 text-sm">
                <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0 text-status-caution" />
                <span>
                  {remaining} {remaining === 1 ? "item hasn't" : "items haven't"}{" "}
                  been checked. {remaining === 1 ? "It" : "They"}&apos;ll be
                  recorded as unchecked — this week&apos;s record won&apos;t
                  confirm whether {remaining === 1 ? "it was" : "they were"}{" "}
                  present.
                </span>
              </div>
            )}
            {remaining === 0 &&
            missing.length === 0 &&
            shortfalls.length === 0 &&
            issues.length === 0 &&
            notApplicable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Everything is present — {checkedCount}{" "}
                {checkedCount === 1 ? "item" : "items"} accounted for.
              </p>
            ) : (
              <>
                <SummaryList
                  label="Missing"
                  tone="text-status-critical"
                  rows={missing.map((e) => itemName(e.item_id))}
                />
                <SummaryList
                  label="Short count"
                  tone="text-status-caution"
                  rows={shortfalls.map(
                    (e) =>
                      `${itemName(e.item_id)} — saw ${e.quantity_seen} of ${e.quantity_expected}`
                  )}
                />
                <SummaryList
                  label="With issues"
                  tone="text-status-caution"
                  rows={issues.map((e) => itemName(e.item_id))}
                />
                <SummaryList
                  label="Not applicable"
                  tone="text-status-neutral"
                  rows={notApplicable.map((e) => itemName(e.item_id))}
                />
                <SummaryList
                  label="Unchecked"
                  tone="text-status-caution"
                  rows={uncheckedItems.map((it) => it.item_name)}
                />
                {(missing.length > 0 || shortfalls.length > 0) && (
                  <p className="text-sm text-muted-foreground">
                    Completing will email the team about the{" "}
                    {missing.length > 0 ? "missing" : "short"} items.
                  </p>
                )}
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmComplete(false)}>
                Keep checking
              </Button>
              <Button loading={busy} onClick={complete}>
                {remaining > 0
                  ? `Complete with ${remaining} unchecked`
                  : "Complete check"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmAbandon && (
        <Modal title="Abandon this check" onClose={() => setConfirmAbandon(false)}>
          <p className="text-sm text-muted-foreground">
            Abandoning discards this walkthrough&apos;s progress from the weekly
            record ({checkedCount} {checkedCount === 1 ? "item" : "items"}{" "}
            marked so far) and lets anyone start the {deptName}{" "}
            {label.toLowerCase()} check again this week.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmAbandon(false)}>
              Keep checking
            </Button>
            <Button variant="destructive" loading={busy} onClick={abandon}>
              Abandon check
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SummaryList({
  label,
  tone,
  rows,
}: {
  label: string;
  tone: string;
  rows: string[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "text-[0.6875rem] font-bold uppercase tracking-[0.04em]",
          tone
        )}
      >
        {label} ({rows.length})
      </span>
      <ul className="flex flex-col gap-0.5 text-sm">
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Completed / abandoned summary                                              */
/* ------------------------------------------------------------------------- */

function SummaryView({ session }: { session: CheckSession }) {
  const { departmentName, profileName } = useReference();
  const { data: items = [] } = useQuery(
    itemsByDepartmentQuery(session.department_id)
  );

  const label = CHECK_TYPE_LABEL[session.session_type];
  const deptName = departmentName(session.department_id);
  const isCurrentWeek = session.week_start === weekStartIso();
  const itemName = (id: string) =>
    items.find((it) => it.id === id)?.item_name ?? "Unknown item";

  const byResult = (result: CheckEntry["result"]) =>
    session.entries.filter((e) => e.result === result);
  const shortfalls = session.entries.filter(isShortfall);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild size="icon-sm" variant="ghost" aria-label="Back">
            <Link href="/checks">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <span className="h-title">
              {deptName} — {label} check
            </span>
            <span className="text-sm text-muted-foreground">
              Week of {format(parseISO(session.week_start), "EEE d MMM yyyy")}
              {session.status === "completed" && session.completed_by
                ? ` · completed by ${profileName(session.completed_by)}`
                : session.status === "abandoned"
                  ? " · abandoned"
                  : ""}
            </span>
          </div>
        </div>
      </div>

      {session.status === "completed" && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-border bg-card p-4 text-sm">
          <Stat label="Items" value={session.total_items ?? 0} />
          <Stat label="Present" value={session.present_count ?? 0} />
          <Stat
            label="Missing"
            value={session.missing_count ?? 0}
            tone={session.missing_count ? "text-status-critical" : undefined}
          />
          <Stat
            label="Issues"
            value={session.issue_count ?? 0}
            tone={session.issue_count ? "text-status-caution" : undefined}
          />
          <Stat
            label="Short"
            value={session.shortfall_count ?? 0}
            tone={session.shortfall_count ? "text-status-caution" : undefined}
          />
          <Stat
            label="N/A"
            value={session.na_count ?? 0}
            tone={session.na_count ? "text-status-neutral" : undefined}
          />
          <Stat
            label="Unchecked"
            value={session.unchecked_count ?? 0}
            tone={session.unchecked_count ? "text-status-caution" : undefined}
          />
        </div>
      )}

      {session.entries.length > 0 ? (
        <div className="flex flex-col gap-4">
          <EntryGroup
            title="Missing"
            entries={byResult("missing")}
            itemName={itemName}
          />
          <EntryGroup
            title="Short count"
            entries={shortfalls}
            itemName={itemName}
          />
          <EntryGroup
            title="With issues"
            entries={byResult("issue")}
            itemName={itemName}
          />
          <EntryGroup
            title="Not applicable"
            entries={byResult("not_applicable")}
            itemName={itemName}
          />
          <EntryGroup
            title="Present"
            entries={byResult("present").filter((e) => !isShortfall(e))}
            itemName={itemName}
          />
        </div>
      ) : (
        !isCurrentWeek && (
          <p className="text-sm text-muted-foreground">
            Item-level detail isn&apos;t kept loaded for older checks — the
            summary above is the record.
          </p>
        )
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={cn("text-lg font-bold", tone)}>{value}</span>
      <span className="text-xs uppercase tracking-[0.04em] text-ink-faint">
        {label}
      </span>
    </span>
  );
}

function EntryGroup({
  title,
  entries,
  itemName,
}: {
  title: string;
  entries: CheckEntry[];
  itemName: (id: string) => string;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.04em] text-ink-faint">
        {title} ({entries.length})
      </h2>
      <div className="rounded-lg border border-border bg-card">
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-3 border-b border-line-subtle px-3 py-2.5 last:border-b-0"
          >
            <span className="truncate text-[0.9375rem]">
              {itemName(e.item_id)}
            </span>
            <CheckResultBadge entry={e} />
          </div>
        ))}
      </div>
    </section>
  );
}
