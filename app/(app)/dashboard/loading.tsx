import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the dashboard's real layout — header, work queue, stat tiles, then a
 * two-column split — so the shell paints in the right shape while
 * dashboard_stats() resolves, rather than reflowing when the data lands.
 *
 * The header's meta line is reserved here because it renders only after mount
 * (lib/use-now.ts), and an unreserved line would shift the page on hydration.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-44 md:hidden" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <div className="hidden gap-2 md:flex">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>

      <Skeleton className="h-28" />
      <Skeleton className="h-24 md:h-28" />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-72" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </div>
  );
}
