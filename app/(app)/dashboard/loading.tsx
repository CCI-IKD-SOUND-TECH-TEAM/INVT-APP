import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the dashboard's real layout — four KPI cards over a two-column split
 * — so the shell paints in the right shape while dashboard_stats() resolves,
 * rather than reflowing when the data lands.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>

      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-8 w-44 md:hidden" />
        <Skeleton className="h-5 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="order-last h-96 lg:order-none" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-40" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </div>
  );
}
