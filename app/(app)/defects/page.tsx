import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { defectsQuery, referenceQuery } from "@/lib/queries";
import { getDefects } from "@/lib/data/defects";
import { getReference } from "@/lib/data/reference";
import DefectsClient from "./DefectsClient";

/**
 * Defects no longer need the item table: getDefects() joins the item name and
 * category id each row renders. The item picker in the log modal fetches its
 * own options when it opens.
 */
export default async function DefectsPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({ ...defectsQuery(), queryFn: () => getDefects() }),
    queryClient.prefetchQuery({ ...referenceQuery(), queryFn: getReference }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DefectsClient />
    </HydrationBoundary>
  );
}
