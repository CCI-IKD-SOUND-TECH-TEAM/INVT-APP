"use client";

import Link from "next/link";
import { IconCircleCheckFilled as CheckCircleIcon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import StartCheckMenu from "@/components/dashboard/StartCheckMenu";
import { CHECK_TYPE_LABEL } from "@/lib/checks";
import type { CheckSlot } from "@/lib/queries/use-week-check-slots";
import type { LowStockItem } from "@/lib/api-types";
import { cn } from "@/lib/utils";

/**
 * What needs doing, as sentences with buttons.
 *
 * This replaces the old attention strip (bare counts) and defect summary (a
 * 2×2 of numbers, two of them historical). A count tells you a number; a row
 * here tells you what it means and hands you the control that acts on it.
 *
 * Tone rides on a 6px dot, never the numeral — DESIGN.md's Glyph-Only Rule.
 */

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function QueueRow({
  tone,
  children,
  action,
}: {
  tone: "critical" | "caution";
  children: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
      {/* mt-2 puts the dot on the first line's optical centre rather than the
          middle of a sentence that wraps to three lines. */}
      <span
        aria-hidden
        className={cn(
          "mt-2 size-1.5 shrink-0 rounded-full",
          tone === "critical" ? "bg-status-critical" : "bg-status-caution"
        )}
      />
      <span className="min-w-0 flex-1 text-sm">{children}</span>
      <span className="ml-auto shrink-0 self-center">{action}</span>
    </li>
  );
}

const Count = ({ value }: { value: number }) => (
  <span className="font-bold tabular-nums">{value}</span>
);

export interface WorkQueueProps {
  notStarted: CheckSlot[];
  openDefectsTotal: number;
  highOpenCount: number;
  oldestOpenDays: number;
  lowStockCount: number;
  worstLowStock: LowStockItem | null;
  bestStreak: { deptName: string; weeks: number } | null;
  /** Sunday: a pending check is due today rather than already overdue. */
  serviceDay: boolean;
  /** False when no department has anything to check — changes the all-clear copy. */
  hasCheckSlots: boolean;
}

export default function WorkQueue({
  notStarted,
  openDefectsTotal,
  highOpenCount,
  oldestOpenDays,
  lowStockCount,
  worstLowStock,
  bestStreak,
  serviceDay,
  hasCheckSlots,
}: WorkQueueProps) {
  const rows: React.ReactNode[] = [];

  if (notStarted.length > 0) {
    // Name the first three; past that the list is longer than the sentence.
    const named = notStarted
      .slice(0, 3)
      .map((s) => `${s.deptName} ${CHECK_TYPE_LABEL[s.type]}`)
      .join(", ");
    const rest = notStarted.length - 3;
    rows.push(
      <QueueRow
        key="checks"
        // On Sunday the service hasn't happened yet, so a pending check is
        // simply due today. From Monday the same state is overdue.
        tone={serviceDay ? "caution" : "critical"}
        action={<StartCheckMenu slots={notStarted} size="sm" variant="secondary" />}
      >
        <Count value={notStarted.length} />{" "}
        {serviceDay
          ? `${plural(notStarted.length, "check", "checks")} to do today: `
          : `${plural(notStarted.length, "check", "checks")} not started: `}
        {named}
        {rest > 0 && ` and ${rest} more`}
      </QueueRow>
    );
  }

  if (openDefectsTotal > 0) {
    rows.push(
      <QueueRow
        key="defects"
        tone="critical"
        action={
          <Button
            asChild
            size="sm"
            variant="secondary"
            aria-label="View the defect log"
          >
            <Link href="/defects">View</Link>
          </Button>
        }
      >
        <Count value={openDefectsTotal} />{" "}
        {plural(openDefectsTotal, "open defect", "open defects")}
        {highOpenCount > 0 && (
          <>
            , <Count value={highOpenCount} /> high
          </>
        )}
        {oldestOpenDays > 0 && (
          <>
            , oldest <Count value={oldestOpenDays} />{" "}
            {plural(oldestOpenDays, "day", "days")}
          </>
        )}
      </QueueRow>
    );
  }

  if (lowStockCount > 0) {
    rows.push(
      <QueueRow
        key="low-stock"
        tone="caution"
        action={
          <Button
            asChild
            size="sm"
            variant="secondary"
            aria-label="View low stock items"
          >
            <Link href="/inventory?lowStock=1">View</Link>
          </Button>
        }
      >
        <Count value={lowStockCount} />{" "}
        {plural(lowStockCount, "item", "items")} low on stock
        {worstLowStock && (
          <>
            {lowStockCount === 1 ? ": " : ", worst: "}
            {worstLowStock.item_name} {worstLowStock.quantity} of{" "}
            {worstLowStock.minimum_stock_threshold}
          </>
        )}
      </QueueRow>
    );
  }

  const shell =
    "rounded-lg border border-border bg-card px-4 py-3 md:px-6 md:py-4";

  if (rows.length === 0) {
    return (
      <div className={shell}>
        <p className="flex items-center gap-2 text-sm">
          <CheckCircleIcon
            className="size-4 shrink-0 text-status-good"
            aria-hidden
          />
          {hasCheckSlots
            ? "All clear. Every check done, no open defects."
            : "All clear. No open defects."}
        </p>
        {bestStreak && bestStreak.weeks >= 2 && (
          <p className="mt-1 pl-6 text-xs text-ink-faint">
            {bestStreak.deptName} has been fully checked {bestStreak.weeks}{" "}
            weeks in a row.
          </p>
        )}
      </div>
    );
  }

  return (
    <section className={shell} aria-labelledby="work-queue-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="work-queue-heading" className="h-title">
          Needs attention
        </h2>
        <span className="text-xs tabular-nums text-ink-faint">
          {rows.length} {plural(rows.length, "item", "items")}
        </span>
      </div>
      <ul className="divide-y divide-line-subtle">{rows}</ul>
    </section>
  );
}
