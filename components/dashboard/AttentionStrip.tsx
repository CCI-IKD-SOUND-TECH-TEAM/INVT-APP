"use client";

import Link from "next/link";
import { IconAlertTriangle as ExclamationTriangleIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface AttentionData {
  openDefects: number;
  defectiveAssets: number;
  lowStockCount: number;
}

function Segment({
  href,
  count,
  label,
  tone,
}: {
  href: string;
  count: number;
  label: string;
  tone: "critical" | "caution";
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-baseline gap-1.5 rounded-md px-2 py-1 transition-colors duration-150 hover:bg-popover"
    >
      <span
        className={cn(
          "font-bold tabular-nums",
          tone === "critical" ? "text-status-critical" : "text-status-caution"
        )}
      >
        {count}
      </span>
      <span className="text-sm text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
    </Link>
  );
}

export default function AttentionStrip({ data }: { data: AttentionData }) {
  const segments = [
    data.openDefects > 0 && (
      <Segment
        key="open"
        href="/defects?status=Open"
        count={data.openDefects}
        label={data.openDefects === 1 ? "open defect" : "open defects"}
        tone="critical"
      />
    ),
    data.defectiveAssets > 0 && (
      <Segment
        key="defective"
        href="/inventory?status=Defective,Under%20Repair"
        count={data.defectiveAssets}
        label="defective or under repair"
        tone="critical"
      />
    ),
    data.lowStockCount > 0 && (
      <Segment
        key="low"
        href="/inventory?lowStock=1"
        count={data.lowStockCount}
        label="low on stock"
        tone="caution"
      />
    ),
  ].filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="mr-1 inline-flex items-center gap-2 pl-1">
        <ExclamationTriangleIcon className="size-4 shrink-0 text-brand" />
        <span className="text-sm font-bold">Needs attention</span>
      </span>
      {segments.map((seg, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span className="px-0.5 text-line" aria-hidden>·</span>}
          {seg}
        </span>
      ))}
    </div>
  );
}
