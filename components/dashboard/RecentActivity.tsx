"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  IconArchive as ArchiveBoxIcon,
  IconAlertTriangle as ExclamationTriangleIcon,
  IconTool as WrenchScrewdriverIcon,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/lib/types";

/**
 * The audit trail's most recent rows — accountability, visible by default.
 *
 * Extracted from the old DashboardTabs, where it shared a tab strip with a
 * low-stock table. That table duplicated what the work queue and the low-stock
 * tile now say, so the tabs went and the feed stands on its own.
 */

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 8) return `${days}d ago`;
  // Beyond a week, a real date is more useful than "3mo ago" in a record
  // meant for accountability.
  return format(new Date(iso), "d MMM yyyy");
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

export default function RecentActivity({
  activity,
}: {
  activity: AuditEntry[];
}) {
  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pb-1 pt-5">
        <h2 className="h-title">Recent activity</h2>
        <Link
          href="/activity"
          className="text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-160 ease-out-quart hover:text-brand"
        >
          View all
        </Link>
      </div>

      <div className="flex flex-col px-2 pb-2">
        {activity.slice(0, 8).map((a, idx) => (
          <div
            key={a.id}
            className={cn(
              "flex items-start gap-3 rounded-md px-3 py-3 transition-colors duration-160 ease-out-quart hover:bg-surface",
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
    </Card>
  );
}
