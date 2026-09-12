"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { IconArchive as ArchiveBoxIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { activityQuery, dashboardQuery } from "@/lib/queries";
import { useWeekCheckSlots } from "@/lib/queries/use-week-check-slots";
import { useReference } from "@/lib/queries/use-reference";
import { daysUntilService, departmentCheckStreak } from "@/lib/checks";
import { worstLowStockItem } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import WorkQueue from "@/components/dashboard/WorkQueue";
import StatTiles from "@/components/dashboard/StatTiles";
import WeeklyCheckCard from "@/components/dashboard/WeeklyCheckCard";
import OpenDefectsTable from "@/components/dashboard/OpenDefectsTable";
import RecentActivity from "@/components/dashboard/RecentActivity";

/**
 * The dashboard answers one question: what needs doing before Sunday.
 *
 * Everything above the fold is ordered by how soon it needs a decision — the
 * work queue, then the numbers that give it context — and only below that do
 * the standing surfaces (checks, defects, activity) appear.
 *
 * Every number arrives pre-aggregated from dashboard_stats() (migrations 0008
 * and 0012). The data is prefetched by the server component above and hydrated
 * into the same cache keys, so these hooks resolve on first render.
 */
export default function DashboardClient() {
  const { data: stats, dataUpdatedAt } = useQuery(dashboardQuery());
  const { data: activity = [] } = useQuery(activityQuery(8));
  const { departments, departmentIdByName } = useReference();
  const { slots, notStarted, sessions } = useWeekCheckSlots();

  // Suspended by the boundary in page.tsx on first load; on a cache miss after
  // an invalidation this keeps the previous frame rather than unmounting.
  if (!stats) return null;

  if (stats.totalItems === 0) {
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

  const worstLowStock = worstLowStockItem(stats.lowStockItems);

  // The all-clear state's reward line: the longest run any department has.
  const bestStreak = departments.reduce<{
    deptName: string;
    weeks: number;
  } | null>((best, deptName) => {
    const id = departmentIdByName(deptName);
    if (!id) return best;
    const weeks = departmentCheckStreak(sessions, id);
    return !best || weeks > best.weeks ? { deptName, weeks } : best;
  }, null);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader updatedAt={dataUpdatedAt} notStarted={notStarted} />

      <WorkQueue
        notStarted={notStarted}
        openDefectsTotal={stats.openDefectsTotal}
        highOpenCount={stats.highOpenCount}
        oldestOpenDays={stats.oldestOpenDays}
        lowStockCount={stats.lowStockCount}
        worstLowStock={worstLowStock}
        bestStreak={bestStreak}
        // The check week opens on Sunday, the service day: a pending check is
        // due today, not overdue.
        serviceDay={daysUntilService() === 0}
        hasCheckSlots={slots.length > 0}
      />

      <StatTiles
        totalAssets={stats.totalAssets}
        itemsAddedLast30={stats.itemsAddedLast30}
        defectiveAssets={stats.defectiveAssets}
        defectsOpenedLast30={stats.defectsOpenedLast30}
        defectsResolvedLast30={stats.defectsResolvedLast30}
        lowStockCount={stats.lowStockCount}
        worstLowStock={worstLowStock}
      />

      {/* The dated work leads the wide column; the standing record sits beside
          it. Stacking below lg keeps that order without any reordering. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <WeeklyCheckCard />
          <OpenDefectsTable
            rows={stats.openDefects}
            total={stats.openDefectsTotal}
          />
        </div>

        <div className="flex flex-col gap-4">
          <RecentActivity activity={activity} />
        </div>
      </div>
    </div>
  );
}
