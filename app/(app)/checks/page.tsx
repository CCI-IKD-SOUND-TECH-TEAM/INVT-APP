import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import {
  checksQuery,
  departmentItemCountsQuery,
  referenceQuery,
} from "@/lib/queries";
import { getChecks } from "@/lib/data/checks";
import { getDepartmentItemCounts } from "@/lib/data/items";
import { getReference } from "@/lib/data/reference";
import ChecksClient from "./ChecksClient";

/**
 * The weekly-check landing needs sessions, department labels, and how many
 * items each department's walkthrough covers — no item rows.
 */
export default async function ChecksPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({ ...checksQuery(12), queryFn: () => getChecks(12) }),
    queryClient.prefetchQuery({
      ...departmentItemCountsQuery(),
      queryFn: getDepartmentItemCounts,
    }),
    queryClient.prefetchQuery({ ...referenceQuery(), queryFn: getReference }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChecksClient />
    </HydrationBoundary>
  );
}
