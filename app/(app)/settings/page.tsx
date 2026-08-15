import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { referenceQuery, taxonomyUsageQuery } from "@/lib/queries";
import { getReference } from "@/lib/data/reference";
import { getTaxonomyUsage } from "@/lib/data/taxonomy";
import SettingsClient from "./SettingsClient";

/** Taxonomy lists plus the item counts rendered beside them. */
export default async function SettingsPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({ ...referenceQuery(), queryFn: getReference }),
    queryClient.prefetchQuery({
      ...taxonomyUsageQuery(),
      queryFn: getTaxonomyUsage,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsClient />
    </HydrationBoundary>
  );
}
