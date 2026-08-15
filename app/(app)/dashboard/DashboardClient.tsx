"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { IconArchive as ArchiveBoxIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { activityQuery, dashboardQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import SectionCards from "@/components/dashboard/SectionCards";
import CategoryBreakdown from "@/components/dashboard/CategoryBreakdown";
import DefectSummary from "@/components/dashboard/DefectSummary";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import WeeklyCheckCard from "@/components/dashboard/WeeklyCheckCard";

/**
 * Every number on this screen now arrives pre-aggregated from
 * dashboard_stats() (migration 0008). It used to be computed here by iterating
 * the full item and defect arrays the layout had shipped to the browser.
 *
 * The data is prefetched by the server component above and hydrated into the
 * same cache keys, so these hooks resolve on first render — no client waterfall.
 */
export default function DashboardClient() {
  const { data: stats } = useQuery(dashboardQuery());
  const { data: activity = [] } = useQuery(activityQuery(10));

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
          totalAssets: stats.totalAssets,
          activeAssets: stats.activeAssets,
          defectiveAssets: stats.defectiveAssets,
          lowStockCount: stats.lowStockCount,
        }}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Stacked on mobile the dated task outranks the activity feed, so the
            right-hand column comes first below lg:. Matches handoff screen 2a:
            counts → weekly check → defects → activity. */}
        <div className="order-last lg:order-none">
          <DashboardTabs
            activity={activity}
            lowStockItems={stats.lowStockItems}
          />
        </div>

        <div className="flex flex-col gap-4">
          <WeeklyCheckCard />
          <DefectSummary counts={stats.defectCounts} />
          <CategoryBreakdown data={stats.categoryBreakdown} />
        </div>
      </div>
    </div>
  );
}
