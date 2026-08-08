"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { isLowStock } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { IconArchive as ArchiveBoxIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import SectionCards from "@/components/dashboard/SectionCards";
import CategoryBreakdown from "@/components/dashboard/CategoryBreakdown";
import DefectSummary from "@/components/dashboard/DefectSummary";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import WeeklyCheckCard from "@/components/dashboard/WeeklyCheckCard";

export default function DashboardPage() {
  const { items, defects, activity, categoryName } = useStore();

  const nonRetired = items.filter((i) => i.status !== "Retired");

  const totalAssets = nonRetired.length;
  const activeAssets = items.filter(
    (i) => i.status === "Available" || i.status === "In Use"
  ).length;
  const defectiveAssets = items.filter(
    (i) => i.status === "Defective" || i.status === "Under Repair"
  ).length;
  const lowStockItems = useMemo(
    () => nonRetired.filter(isLowStock),
    [nonRetired]
  );

  // Top 7 categories shown individually; the rest collapse into "Other".
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    nonRetired.forEach((i) => {
      const cat = categoryName(i.category_id);
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const rows = sorted
      .slice(0, 7)
      .map(([category, count]) => ({ category, count }));
    const rest = sorted.slice(7);
    if (rest.length > 0) {
      rows.push({
        category: `Other (${rest.length})`,
        count: rest.reduce((s, [, c]) => s + c, 0),
      });
    }
    return rows;
  }, [nonRetired]);

  // Resolved / Not Repairable are windowed to the last 30 days.
  const [thirtyDaysAgo] = useState(() => Date.now() - 30 * 24 * 60 * 60 * 1000);
  const defectCounts = {
    Open: defects.filter((d) => d.status === "Open").length,
    "Under Repair": defects.filter((d) => d.status === "Under Repair").length,
    Resolved: defects.filter(
      (d) =>
        d.status === "Resolved" &&
        new Date(d.history[d.history.length - 1]?.timestamp ?? 0).getTime() >=
          thirtyDaysAgo
    ).length,
    "Not Repairable": defects.filter(
      (d) =>
        d.status === "Not Repairable" &&
        new Date(d.history[d.history.length - 1]?.timestamp ?? 0).getTime() >=
          thirtyDaysAgo
    ).length,
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-4 py-16 text-center">
        <ArchiveBoxIcon className="size-10" />
        <h2 className="h-headline">No inventory yet</h2>
        <p className="text-muted-foreground">
          Add your first item to get started.
        </p>
        <Button asChild>
          <Link href="/inventory/new">
            <PlusIcon className="size-4" /> Add your first item
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {/* Below md: the shared SiteHeader is hidden, so the page carries its
              own title — and the tab bar's centre button is "Log a defect". */}
          <p className="h-label md:hidden">Ikorodu · Media Team</p>
          <h1 className="h-headline md:hidden">Dashboard</h1>
          <p className="mt-1.5 text-muted-foreground md:mt-0">
            An overview of every asset, defect, and repair in flight.
          </p>
        </div>
        <Button asChild className="hidden md:inline-flex">
          <Link href="/defects?log=1">
            <PlusIcon className="size-4" /> Log a defect
          </Link>
        </Button>
      </div>

      <SectionCards
        data={{
          totalAssets,
          activeAssets,
          defectiveAssets,
          lowStockCount: lowStockItems.length,
        }}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Stacked on mobile the dated task outranks the activity feed, so the
            right-hand column comes first below lg:. Matches handoff screen 2a:
            counts → weekly check → defects → activity. */}
        <div className="order-last lg:order-none">
          <DashboardTabs activity={activity} lowStockItems={lowStockItems} />
        </div>

        <div className="flex flex-col gap-4">
          <WeeklyCheckCard />
          <DefectSummary counts={defectCounts} />
          <CategoryBreakdown data={categoryData} />
        </div>
      </div>
    </div>
  );
}
