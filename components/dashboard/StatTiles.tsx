"use client";

import Link from "next/link";
import type { LowStockItem } from "@/lib/api-types";

/**
 * Three numbers, each with the context that makes it mean something.
 *
 * The four KPI cards this replaces were four bordered boxes carrying four bare
 * counts, one of which (Active) was just Total minus Defective. A number with
 * no comparison can't tell you whether to act, so every tile now carries a
 * 30-day line beneath it.
 *
 * One container with hairline dividers, not three cards: they are one reading,
 * and three borders around three numbers is decoration, not information.
 * No tone anywhere — the work queue above carries urgency, and a tinted tile
 * competing with it would split the signal (DESIGN.md, Resting-Normal Rule).
 */

function Tile({
  href,
  label,
  value,
  foot,
}: {
  href: string;
  label: string;
  value: number;
  foot: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}. ${foot}`}
      className="@container/tile flex min-w-0 flex-col gap-1 px-3 py-3 transition-colors duration-160 ease-out-quart hover:bg-surface-raised md:px-5 md:py-4"
    >
      <span className="h-label">{label}</span>
      <span
        aria-hidden
        className="font-display text-[clamp(1.75rem,10cqi,2.5rem)] leading-none tabular-nums"
      >
        {value}
      </span>
      <span aria-hidden className="text-xs text-ink-faint">
        {foot}
      </span>
    </Link>
  );
}

export interface StatTilesProps {
  totalAssets: number;
  itemsAddedLast30: number;
  defectiveAssets: number;
  defectsOpenedLast30: number;
  defectsResolvedLast30: number;
  lowStockCount: number;
  worstLowStock: LowStockItem | null;
}

export default function StatTiles({
  totalAssets,
  itemsAddedLast30,
  defectiveAssets,
  defectsOpenedLast30,
  defectsResolvedLast30,
  lowStockCount,
  worstLowStock,
}: StatTilesProps) {
  return (
    <div className="grid grid-cols-3 divide-x divide-line-subtle rounded-lg border border-border bg-card">
      <Tile
        href="/inventory"
        label="Assets"
        value={totalAssets}
        foot={
          itemsAddedLast30 > 0
            ? `+${itemsAddedLast30} added in 30 days`
            : "Nothing added in 30 days"
        }
      />
      <Tile
        href="/inventory?status=Defective,Under%20Repair"
        label="Defective"
        value={defectiveAssets}
        foot={`${defectsOpenedLast30} opened · ${defectsResolvedLast30} resolved, 30 days`}
      />
      <Tile
        href="/inventory?lowStock=1"
        label="Low stock"
        value={lowStockCount}
        foot={
          worstLowStock
            ? `Worst: ${worstLowStock.item_name}`
            : "Nothing below threshold"
        }
      />
    </div>
  );
}
