import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { activityQuery, checksQuery, dashboardQuery } from "@/lib/queries";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getActivity } from "@/lib/data/activity";
import { getChecks } from "@/lib/data/checks";
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
    // WeeklyCheckCard and the reference labels render in the same frame —
    // prefetching them here keeps the card from popping in after hydration.
    queryClient.prefetchQuery({
      ...checksQuery(1),
      queryFn: () => getChecks(1),
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
