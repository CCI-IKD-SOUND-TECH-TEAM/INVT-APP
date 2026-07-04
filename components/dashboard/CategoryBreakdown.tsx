"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export interface CategoryDatum {
  category: string;
  count: number;
}

export default function CategoryBreakdown({ data }: { data: CategoryDatum[] }) {
  const rows = [...data].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <Card>
      <CardHeader className="mb-3">
        <CardTitle>Assets by Category</CardTitle>
        <span className="text-[0.8125rem] tabular-nums text-ink-faint">
          {total} total
        </span>
      </CardHeader>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[0.8125rem] text-ink-faint">
          No category data yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => {
            // The "Other (N)" row links to the unfiltered listing, not a filter.
            const isOther = r.category.startsWith("Other (");
            const href = isOther
              ? "/inventory"
              : `/inventory?category=${encodeURIComponent(r.category)}`;
            return (
            <li key={r.category}>
              <Link
                href={href}
                className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-popover focus-visible:bg-popover"
              >
                <span className="w-[112px] shrink-0 truncate text-[0.8125rem] text-foreground">
                  {r.category}
                </span>
                <span
                  className="h-2 flex-1 overflow-hidden rounded-full bg-popover"
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-full bg-[#4a4a52] transition-[width,background-color] duration-200 ease-out group-hover:bg-[#5a5a63]"
                    style={{ width: `${(r.count / max) * 100}%` }}
                  />
                </span>
                <span className="w-[24px] shrink-0 text-right text-[0.8125rem] font-bold tabular-nums">
                  {r.count}
                </span>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
