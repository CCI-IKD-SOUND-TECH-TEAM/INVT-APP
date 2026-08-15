import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import {
  itemStatusCountsQuery,
  itemsQuery,
  referenceQuery,
} from "@/lib/queries";
import { getItemStatusCounts, getItemsPage } from "@/lib/data/items";
import { getReference } from "@/lib/data/reference";
import type { ItemFilters } from "@/lib/queries/keys";
import type { ItemStatus } from "@/lib/types";
import InventoryClient from "./InventoryClient";

/**
 * Server half of the inventory list.
 *
 * The client reads the same filter searchParams to seed its own state, so the
 * filters are resolved twice — once here to prefetch the right first page, once
 * there to drive the UI. Keeping them in sync matters: a mismatch means the
 * prefetched entry sits under a key nothing reads and the client refetches.
 */
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const queryClient = getQueryClient();

  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  // The panel holds category and department as display names; the query wants
  // ids, so reference data has to land before the first page can be prefetched.
  const reference = await getReference();
  queryClient.setQueryData(referenceQuery().queryKey, reference);

  const categoryName = one("category");
  const departmentName = one("department");

  const filters: Partial<ItemFilters> = {
    page: 1,
    statuses: (one("status")?.split(",").filter(Boolean) ?? []) as ItemStatus[],
    categoryIds: reference.categories
      .filter((c) => c.name === categoryName)
      .map((c) => c.id),
    departmentIds: reference.departments
      .filter((d) => d.name === departmentName)
      .map((d) => d.id),
    lowStockOnly: one("lowStock") === "1",
    includeRetired: false,
    q: "",
    sort: "name",
    dir: "asc",
  };

  await Promise.all([
    queryClient.prefetchQuery({
      ...itemsQuery(filters),
      queryFn: () => getItemsPage(filters),
    }),
    queryClient.prefetchQuery({
      ...itemStatusCountsQuery(),
      queryFn: getItemStatusCounts,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryClient />
    </HydrationBoundary>
  );
}
