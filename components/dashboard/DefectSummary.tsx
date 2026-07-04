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

const CELL: Record<keyof DefectCounts, { tone: string; href: string }> = {
  Open: { tone: "text-status-critical", href: "/defects?status=Open" },
  "Under Repair": {
    tone: "text-status-caution",
    href: "/defects?status=Under%20Repair",
  },
  Resolved: { tone: "text-status-good", href: "/defects?status=Resolved" },
  "Not Repairable": {
    tone: "text-status-neutral",
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
          className="shrink-0 text-[0.8125rem] font-bold text-brand hover:text-brand-deep"
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
                  zero ? "text-ink-faint" : CELL[key].tone
                )}
              >
                {counts[key]}
              </span>
              <span className="text-xs text-muted-foreground">{key}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
