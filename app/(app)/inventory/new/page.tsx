import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { itemOptionsQuery, itemQuery, referenceQuery } from "@/lib/queries";
import { getItemById, getItemOptions } from "@/lib/data/items";
import { getReference } from "@/lib/data/reference";
import NewItemClient from "./NewItemClient";

/**
 * Add / edit item. On an edit the row is prefetched by id, so the form's
 * initial state is populated on first render rather than after a round trip.
 */
export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.id;
  const editId = Array.isArray(raw) ? raw[0] : raw;

  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({ ...referenceQuery(), queryFn: getReference }),
    // Backs the duplicate-name check.
    queryClient.prefetchQuery({
      ...itemOptionsQuery(),
      queryFn: getItemOptions,
    }),
    ...(editId
      ? [
          queryClient.prefetchQuery({
            ...itemQuery(editId),
            queryFn: () => getItemById(editId),
          }),
        ]
      : []),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NewItemClient />
    </HydrationBoundary>
  );
}
