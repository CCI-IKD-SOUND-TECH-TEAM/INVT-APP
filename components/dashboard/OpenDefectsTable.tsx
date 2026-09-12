"use client";

import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Card } from "@/components/ui/card";
import SeverityLabel from "@/components/SeverityLabel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OpenDefectRow } from "@/lib/api-types";

/**
 * The five defects to deal with next.
 *
 * The dashboard used to show open defects as a number in a 2×2 grid, which
 * told a volunteer that work existed but not what it was. These are the actual
 * rows, ordered the way you'd triage them: High before Medium before Low, then
 * oldest first. The ordering is done in SQL (migration 0012) so the table and
 * the "oldest N days" sentence in the work queue read the same data.
 */
export default function OpenDefectsTable({
  rows,
  total,
}: {
  rows: OpenDefectRow[];
  total: number;
}) {
  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pb-3 pt-5">
        <h2 className="h-title">Open defects</h2>
        {rows.length > 0 && (
          <span className="text-xs text-ink-faint">Top 5 by severity</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-[0.8125rem] text-ink-faint">
          No open defects right now.
        </p>
      ) : (
        <Table>
          <caption className="sr-only">
            Open defects, the five most urgent by severity then age
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Item</TableHead>
              <TableHead scope="col" className="hidden md:table-cell">
                Issue
              </TableHead>
              <TableHead scope="col">Severity</TableHead>
              <TableHead scope="col" className="text-right">
                Days open
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => {
              const days = Math.max(
                0,
                differenceInCalendarDays(new Date(), new Date(d.date_reported))
              );
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link
                      href={`/defects?defect=${d.id}`}
                      className="font-bold transition-colors duration-160 ease-out-quart hover:text-brand"
                    >
                      {d.item_name}
                    </Link>
                    {d.unit_label && (
                      <span className="text-ink-faint"> · {d.unit_label}</span>
                    )}
                  </TableCell>
                  {/* Below md the item and severity carry the row; the full
                      description is one tap away on the defect itself. */}
                  <TableCell className="hidden max-w-[28ch] truncate text-muted-foreground md:table-cell">
                    <span title={d.description}>{d.description}</span>
                  </TableCell>
                  <TableCell>
                    <SeverityLabel severity={d.severity} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {days}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <div className="px-5 py-3">
        <Link
          href="/defects"
          className="text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-160 ease-out-quart hover:text-brand"
        >
          {total > rows.length
            ? `View all ${total} open defects`
            : "View defect log"}
        </Link>
      </div>
    </Card>
  );
}
