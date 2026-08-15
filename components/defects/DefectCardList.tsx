"use client";

import SeverityLabel from "@/components/SeverityLabel";
import StatusBadge from "@/components/StatusBadge";
import type { DefectWithItem } from "@/lib/api-types";
import { cn } from "@/lib/utils";

/**
 * Mobile defect list (design handoff `1g` / screen `2c`).
 *
 * The desktop table is pinned to `min-w-[720px]`, which clipped Status and
 * Days Open on a phone. Six columns fold into three lines here: name plus
 * category with trailing severity, the description, then status and age.
 *
 * Days-open is kept because it is what makes a stale defect obvious; past a
 * week the card takes a red border and the count turns brand red.
 */

/** Age at which an open defect is called out. */
const OVERDUE_DAYS = 7;

export default function DefectCardList({
  defects,
  categoryName,
  daysOpen,
  onSelect,
  emptyMessage,
  className,
}: {
  /** Carries the item name and category id from the join — no lookup needed. */
  defects: DefectWithItem[];
  categoryName: (id: string) => string;
  daysOpen: (dateReported: string) => number;
  onSelect: (id: string) => void;
  emptyMessage: string;
  className?: string;
}) {
  if (defects.length === 0) {
    return (
      <p
        className={cn(
          "rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground",
          className
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {defects.map((d) => {
        const isTerminal =
          d.status === "Resolved" || d.status === "Not Repairable";
        const age = daysOpen(d.date_reported);
        const overdue = !isTerminal && age >= OVERDUE_DAYS;

        return (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => onSelect(d.id)}
              className={cn(
                "flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-3.5 text-left transition-colors duration-150 active:bg-accent",
                overdue && "border-status-critical/40"
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className="text-[0.9375rem] leading-tight font-bold">
                    {d.item_name}
                  </span>
                  <span className="truncate text-xs text-ink-faint">
                    {/* Names the physical unit when the defect is scoped to one,
                        so two speakers don't read identically in the list. */}
                    {d.unit_label
                      ? `${d.unit_label} · ${categoryName(d.category_id)}`
                      : categoryName(d.category_id)}
                  </span>
                </span>
                <SeverityLabel severity={d.severity} />
              </span>

              <span className="line-clamp-2 text-[0.8125rem] text-muted-foreground">
                {d.description}
              </span>

              <span className="flex items-center justify-between gap-3">
                <StatusBadge status={d.status} />
                <span
                  className={cn(
                    "text-xs",
                    overdue ? "font-bold text-brand" : "text-ink-faint"
                  )}
                >
                  {isTerminal ? "Closed" : `${age} days open`}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
