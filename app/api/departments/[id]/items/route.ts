import { respond } from "@/lib/api/handler";
import { getItemsByDepartment } from "@/lib/data/items";

/**
 * Unpaged on purpose — a check session walks the department's whole list, so
 * paging it would just mean the screen fetching every page anyway.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return respond(() => getItemsByDepartment(id));
}
