"use client";

import Link from "next/link";
import { format } from "date-fns";
import { IconPlus as PlusIcon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import StartCheckMenu from "@/components/dashboard/StartCheckMenu";
import { daysUntilService, serviceCountdownLabel } from "@/lib/checks";
import { useNow } from "@/lib/use-now";
import type { CheckSlot } from "@/lib/queries/use-week-check-slots";

/**
 * Where you are in the week, how fresh the numbers are, and the one action.
 *
 * The deadline on this team is Sunday, so the countdown to it belongs at the
 * top of the screen rather than implied by a check card further down. The
 * freshness stamp is there because an operational dashboard that might be
 * showing a cached frame should say so.
 */

function freshness(now: Date, updatedAt: number): string {
  const mins = Math.max(0, Math.round((now.getTime() - updatedAt) / 60_000));
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `Updated ${hours}h ago`;
}

const Dot = () => (
  <span aria-hidden className="text-line">
    ·
  </span>
);

export default function DashboardHeader({
  updatedAt,
  notStarted,
}: {
  /** `dataUpdatedAt` from the dashboard query. */
  updatedAt: number;
  notStarted: CheckSlot[];
}) {
  // Null on the server and the first client frame — see lib/use-now.ts. The
  // loading skeleton reserves this line, so nothing shifts when it arrives.
  const now = useNow();

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {/* Below md the shared SiteHeader is hidden, so the page carries its
            own title. */}
        <p className="h-label md:hidden">Ikorodu · Media Team</p>
        <h1 className="h-headline md:hidden">Dashboard</h1>
        <div className="mt-1.5 flex min-h-[1.375rem] flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground md:mt-0">
          {now && (
            <>
              <time dateTime={format(now, "yyyy-MM-dd")}>
                {format(now, "EEEE d MMMM")}
              </time>
              <Dot />
              <span>{serviceCountdownLabel(daysUntilService(now))}</span>
              <Dot />
              <time dateTime={new Date(updatedAt).toISOString()}>
                {freshness(now, updatedAt)}
              </time>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StartCheckMenu slots={notStarted} />
        {/* Below md the tab bar's centre button is already "Log a defect". */}
        <Button asChild variant="secondary" className="hidden md:inline-flex">
          <Link href="/defects?log=1">
            <PlusIcon className="size-4" /> Log defect
          </Link>
        </Button>
      </div>
    </div>
  );
}
