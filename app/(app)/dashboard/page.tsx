import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import {
  activityQuery,
  checksQuery,
  dashboardQuery,
  departmentItemCountsQuery,
} from "@/lib/queries";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getActivity } from "@/lib/data/activity";
import { getChecks } from "@/lib/data/checks";
import { getDepartmentItemCounts } from "@/lib/data/items";
import { getReference } from "@/lib/data/reference";
import { referenceQuery } from "@/lib/queries";
import DashboardClient from "./DashboardClient";

/**
 * Server half of the dashboard: prefetch, dehydrate, hand off.
 *
 * The queryFn overrides matter. On the client these queries fetch their route
 * handler; here they call the read function directly — a server component
 * fetching its own /api route would be an HTTP round trip to itself. The keys
 * are identical either way, which is what lets the client hooks resolve from
 * hydrated cache instead of refetching.
 */
export default async function DashboardPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      ...dashboardQuery(),
      queryFn: getDashboardStats,
    }),
    queryClient.prefetchQuery({
      ...activityQuery(10),
      queryFn: () => getActivity(10),
    }),
    // WeeklyCheckCard, the attention strip, and the reference labels render in
    // the same frame — prefetching here keeps them from popping in after
    // hydration. Twelve weeks because the card's streaks read the history.
    queryClient.prefetchQuery({
      ...checksQuery(12),
      queryFn: () => getChecks(12),
    }),
    queryClient.prefetchQuery({
      ...departmentItemCountsQuery(),
      queryFn: getDepartmentItemCounts,
    }),
    queryClient.prefetchQuery({
      ...referenceQuery(),
      queryFn: getReference,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
