"use client";

import Link from "next/link";
import {
  IconArchive as ArchiveBoxIcon,
  IconAlertTriangle as ExclamationTriangleIcon,
  IconTool as WrenchScrewdriverIcon,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { LowStockItem } from "@/lib/api-types";
import type { AuditEntry } from "@/lib/types";

// Items at/below a third of their threshold (or with ≤1 left) read critical; others caution.
function stockRatio(i: LowStockItem) {
  return i.quantity / (i.minimum_stock_threshold || 1);
}
function stockTone(i: LowStockItem) {
  return i.quantity <= 1 || stockRatio(i) <= 0.34
    ? "text-status-critical"
    : "text-status-caution";
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

function ActivityIcon({ type }: { type: AuditEntry["actionType"] }) {
  const Icon =
    type === "Defect" || type === "Repair Status Change"
      ? WrenchScrewdriverIcon
      : type === "Retire"
        ? ExclamationTriangleIcon
        : ArchiveBoxIcon;
  return (
    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-popover text-muted-foreground">
      <Icon className="size-3.5" />
    </span>
  );
}

export default function DashboardTabs({
  activity,
  lowStockItems,
}: {
  activity: AuditEntry[];
  lowStockItems: LowStockItem[];
}) {
  return (
    <Card className="gap-0 p-0">
      <Tabs defaultValue="activity" className="gap-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <TabsList>
            <TabsTrigger value="activity">
              Recent Activity
            </TabsTrigger>
            <TabsTrigger value="low-stock">
              Low Stock
              {lowStockItems.length > 0 && (
                <span className="rounded-full bg-status-caution-bg px-1.5 text-[0.6875rem] font-bold text-status-caution tabular-nums">
                  {lowStockItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <Link
            href="/reports"
            className="text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-150 hover:text-brand"
          >
            View All
          </Link>
        </div>

        <TabsContent value="activity" className="px-2 pb-2">
          <div className="flex flex-col">
            {activity.slice(0, 10).map((a, idx) => (
              <div
                key={a.id}
                className={cn(
                  "flex items-start gap-3 rounded-md px-3 py-3 transition-colors duration-150 hover:bg-surface",
                  idx !== 0 && "border-t border-line-subtle"
                )}
              >
                <ActivityIcon type={a.actionType} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm">
                    <strong className="font-bold">{a.recordLabel}</strong> —{" "}
                    {a.detail}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {a.user} · {timeAgo(a.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="py-8 text-center text-[0.8125rem] text-ink-faint">
                No activity recorded yet.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="low-stock" className="pb-2">
          {lowStockItems.length === 0 ? (
            <p className="py-10 text-center text-[0.8125rem] text-ink-faint">
              Nothing below threshold right now.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty / Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...lowStockItems]
                  .sort((a, b) => stockRatio(a) - stockRatio(b))
                  .map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Link
                          href={`/inventory?q=${encodeURIComponent(i.item_name)}`}
                          className="font-bold hover:text-brand"
                        >
                          {i.item_name}
                        </Link>
                      </TableCell>
                      {/* Resolved by the dashboard_stats join — no client-side
                          id → name lookup needed. */}
                      <TableCell className="text-muted-foreground">
                        {i.category_name}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-bold tabular-nums",
                          stockTone(i)
                        )}
                      >
                        {i.quantity} / {i.minimum_stock_threshold}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
