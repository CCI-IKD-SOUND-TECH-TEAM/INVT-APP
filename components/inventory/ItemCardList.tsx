"use client";

import Link from "next/link";
import { IconAlertTriangle as ExclamationTriangleIcon } from "@tabler/icons-react";
import StatusBadge from "@/components/StatusBadge";
import type { ItemListRow, ItemStatusCounts } from "@/lib/api-types";
import type { ItemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Mobile inventory list (design handoff `1d` / screen `2b`).
 *
 * The desktop table is pinned to `min-w-[860px]`, so on a 390px viewport it
 * clipped the Status column behind a horizontal scroll. Here each row becomes
 * a two-line card: name, then category and status on one foot line. Quantity,
 * location, dates and the row actions are intentionally dropped — they live on
 * the item's own screen.
 */

const CHIP_STATUSES: ItemStatus[] = [
  "Available",
  "In Use",
  "Defective",
  "Under Repair",
  "Retired",
];

export function StatusChips({
  counts,
  statusFilter,
  onSelect,
  className,
}: {
  /**
   * Absolute counts across every item, retired included — computed by
   * inventory_status_counts, not derived from the visible page.
   */
  counts: ItemStatusCounts | undefined;
  statusFilter: Set<ItemStatus>;
  /** `null` clears the filter ("All"). */
  onSelect: (status: ItemStatus | null) => void;
  className?: string;
}) {
  const allActive = statusFilter.size === 0;
  const totalCount = counts?.totalActive ?? 0;

  return (
    <div
      className={cn(
        // Bleeds to the screen edges so the last chip can scroll fully into
        // view rather than dying against the 16px page padding.
        "-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <button
        type="button"
        aria-pressed={allActive}
        onClick={() => onSelect(null)}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-2 text-[0.8125rem] font-bold transition-colors duration-150",
          allActive
            ? "border-foreground bg-foreground text-background"
            : "border-border text-ink-muted"
        )}
      >
        All {totalCount}
      </button>

      {CHIP_STATUSES.map((status) => {
        const active = statusFilter.has(status);
        const count = counts?.byStatus[status] ?? 0;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(status)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-[0.8125rem] font-bold whitespace-nowrap transition-colors duration-150",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border text-ink-muted"
            )}
          >
            {status} {count > 0 ? count : ""}
          </button>
        );
      })}
    </div>
  );
}

export default function ItemCardList({
  items,
  highlightId,
  className,
}: {
  /** The page's already-filtered, already-sorted slice — sorted by Postgres. */
  items: ItemListRow[];
  highlightId?: string | null;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No items match these filters.
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/inventory/new?id=${item.id}`}
              className={cn(
                "flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5 transition-colors duration-150 active:bg-accent",
                item.id === highlightId && "animate-[row-flash_2.4s_ease-out]"
              )}
            >
              <span className="text-[0.9375rem] leading-tight font-bold">
                {item.item_name}
              </span>
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[0.8125rem] text-muted-foreground">
                    {item.category_name}
                  </span>
                  {item.is_low_stock && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-status-caution">
                      <ExclamationTriangleIcon className="size-[11px]" /> Low
                      stock
                    </span>
                  )}
                </span>
                <StatusBadge status={item.status} />
              </span>
            </Link>
          </li>
      ))}
    </ul>
  );
}
