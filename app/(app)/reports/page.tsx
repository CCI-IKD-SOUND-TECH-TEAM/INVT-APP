import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { referenceQuery, reportsQuery } from "@/lib/queries";
import { getReference } from "@/lib/data/reference";
import { getReportsDataset } from "@/lib/data/reports";
import ReportsClient from "./ReportsClient";

/**
 * The one route that legitimately reads the whole dataset — reports are
 * cross-entity exports with nothing to push down into SQL. It is now fetched
 * only when this page is opened, instead of by every route via the layout.
 */
export default async function ReportsPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      ...reportsQuery(),
      queryFn: getReportsDataset,
    }),
    queryClient.prefetchQuery({ ...referenceQuery(), queryFn: getReference }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReportsClient />
    </HydrationBoundary>
  );
}
