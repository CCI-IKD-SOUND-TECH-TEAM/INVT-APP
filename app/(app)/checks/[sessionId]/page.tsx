import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import {
  checkSessionQuery,
  itemsByDepartmentQuery,
  referenceQuery,
} from "@/lib/queries";
import { getCheckSession } from "@/lib/data/checks";
import { getItemsByDepartment } from "@/lib/data/items";
import { getReference } from "@/lib/data/reference";
import CheckSessionClient from "./CheckSessionClient";

/**
 * The walkthrough needs the session and its department's items. Both are
 * prefetched here so the first tap has data — this screen is used standing in
 * a room, and a client-side waterfall would show an empty list first.
 */
export default async function CheckSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const queryClient = getQueryClient();

  const session = await getCheckSession(sessionId);
  queryClient.setQueryData(checkSessionQuery(sessionId).queryKey, session);

  await Promise.all([
    queryClient.prefetchQuery({ ...referenceQuery(), queryFn: getReference }),
    // Only meaningful once we know which department the session belongs to.
    ...(session
      ? [
          queryClient.prefetchQuery({
            ...itemsByDepartmentQuery(session.department_id),
            queryFn: () => getItemsByDepartment(session.department_id),
          }),
        ]
      : []),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CheckSessionClient />
    </HydrationBoundary>
  );
}
