import { boolParam, intParam, listParam, respond } from "@/lib/api/handler";
import { getItemsPage } from "@/lib/data/items";
import type { ItemFilters, ItemSort } from "@/lib/queries/keys";
import type { ItemStatus } from "@/lib/types";

const SORTS: ItemSort[] = [
  "name",
  "category",
  "status",
  "quantity",
  "dateAcquired",
];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const sort = params.get("sort") as ItemSort | null;
  const dir = params.get("dir");

  const filters: Partial<ItemFilters> = {
    page: intParam(params, "page", 1),
    categoryIds: listParam(params, "category"),
    departmentIds: listParam(params, "department"),
    // Cast is safe: an unrecognised status simply matches no rows, and the
    // column has a CHECK constraint behind it.
    statuses: listParam(params, "status") as ItemStatus[],
    lowStockOnly: boolParam(params, "lowStock"),
    includeRetired: boolParam(params, "includeRetired"),
    q: params.get("q") ?? "",
    sort: sort && SORTS.includes(sort) ? sort : "name",
    dir: dir === "desc" ? "desc" : "asc",
  };

  return respond(() => getItemsPage(filters));
}
