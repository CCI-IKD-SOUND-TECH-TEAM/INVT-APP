"use client";

import Link from "next/link";
import {
  IconArchive as ArchiveBoxIcon,
  IconCircleCheck as CheckCircleIcon,
  IconAlertTriangle as ExclamationTriangleIcon,
  IconTool as WrenchScrewdriverIcon,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "caution" | "critical";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-popover text-muted-foreground",
  good: "bg-status-good-bg text-status-good",
  caution: "bg-status-caution-bg text-status-caution",
  critical: "bg-status-critical-bg text-status-critical",
};

function KpiCard({
  href,
  label,
  value,
  foot,
  icon: Icon,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  foot: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  return (
    <Link
      href={href}
      className="@container/card group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-brand/40"
    >
      <div className="flex items-center justify-between">
        <span className="h-label">{label}</span>
        <span
          className={cn(
            "flex size-[34px] shrink-0 items-center justify-center rounded-sm",
            TONE_CLASS[tone]
          )}
        >
          <Icon className="size-[17px]" />
        </span>
      </div>
      <span className="font-display text-[clamp(2rem,6cqi,2.75rem)] leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[0.8125rem] text-ink-faint">{foot}</span>
    </Link>
  );
}

export interface KpiData {
  totalAssets: number;
  activeAssets: number;
  defectiveAssets: number;
  lowStockCount: number;
}

export default function SectionCards({ data }: { data: KpiData }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
      <KpiCard
        href="/inventory"
        label="Total Assets"
        value={data.totalAssets}
        foot="Excludes retired items"
        icon={ArchiveBoxIcon}
        tone="neutral"
      />
      <KpiCard
        href="/inventory?status=Available,In%20Use"
        label="Active Assets"
        value={data.activeAssets}
        foot="Available or In Use"
        icon={CheckCircleIcon}
        tone="neutral"
      />
      <KpiCard
        href="/inventory?status=Defective,Under%20Repair"
        label="Defective Assets"
        value={data.defectiveAssets}
        foot="Defective or Under Repair"
        icon={WrenchScrewdriverIcon}
        tone="critical"
      />
      <KpiCard
        href="/inventory?lowStock=1"
        label="Low Stock Items"
        value={data.lowStockCount}
        foot="At or below threshold"
        icon={ExclamationTriangleIcon}
        tone="caution"
      />
    </div>
  );
}
