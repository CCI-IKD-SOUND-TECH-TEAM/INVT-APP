import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { activityQuery, referenceQuery } from "@/lib/queries";
import { getActivity } from "@/lib/data/activity";
import { getReference } from "@/lib/data/reference";
import ActivityClient from "./ActivityClient";

// The long tail, not the dashboard's 8-row teaser — /api/activity itself caps
// this at 200 rows, which the client surfaces if it's ever actually hit.
const ACTIVITY_LIMIT = 200;

export default async function ActivityPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      ...activityQuery(ACTIVITY_LIMIT),
      queryFn: () => getActivity(ACTIVITY_LIMIT),
    }),
    queryClient.prefetchQuery({ ...referenceQuery(), queryFn: getReference }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ActivityClient limit={ACTIVITY_LIMIT} />
    </HydrationBoundary>
  );
}
