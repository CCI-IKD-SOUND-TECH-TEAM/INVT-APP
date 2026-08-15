import { respond } from "@/lib/api/handler";
import { getDepartmentItemCounts } from "@/lib/data/items";

export async function GET() {
  return respond(getDepartmentItemCounts);
}
