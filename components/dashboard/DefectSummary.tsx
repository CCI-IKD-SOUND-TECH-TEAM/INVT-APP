"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DefectCounts {
  Open: number;
  "Under Repair": number;
  Resolved: number;
  "Not Repairable": number;
}

/**
 * `dot` is the only colour in a cell — the count itself always renders in
 * neutral ink. Colouring all four numerals turned this 2×2 into a rainbow;
 * now the two states that need action carry a small marker and the rest sit
 * back. `null` means no marker at all.
 */
const CELL: Record<keyof DefectCounts, { dot: string | null; href: string }> = {
  Open: { dot: "bg-status-critical", href: "/defects?status=Open" },
  "Under Repair": {
    dot: "bg-status-caution",
    href: "/defects?status=Under%20Repair",
  },
  Resolved: { dot: null, href: "/defects?status=Resolved" },
  "Not Repairable": {
    dot: null,
    href: "/defects?status=Not%20Repairable",
  },
};

export default function DefectSummary({ counts }: { counts: DefectCounts }) {
  const keys = Object.keys(counts) as (keyof DefectCounts)[];

  return (
    <Card>
      <CardHeader className="mb-1 items-start">
        <div className="flex flex-col gap-0.5">
          <CardTitle>Defect Status Summary</CardTitle>
          <span className="text-xs text-ink-faint">
            Resolved &amp; not repairable: last 30 days
          </span>
        </div>
        <Link
          href="/defects"
          className="shrink-0 text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-150 hover:text-brand"
        >
          View All
        </Link>
      </CardHeader>
      <div className="grid grid-cols-2 gap-2">
        {keys.map((key) => {
          const zero = counts[key] === 0;
          return (
            <Link
              key={key}
              href={CELL[key].href}
              className="flex flex-col gap-1 rounded-md border border-line-subtle bg-popover px-3 py-2.5 transition-colors duration-150 hover:border-border"
            >
              <span
                className={cn(
                  "font-display text-2xl leading-none tabular-nums",
                  zero ? "text-ink-faint" : "text-foreground"
                )}
              >
                {counts[key]}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {CELL[key].dot && !zero && (
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      CELL[key].dot
                    )}
                  />
                )}
                {key}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
