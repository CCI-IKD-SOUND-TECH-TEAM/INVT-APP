import { respond } from "@/lib/api/handler";
import { getItemStatusCounts } from "@/lib/data/items";

/**
 * Static segment, so it takes precedence over the sibling `[id]` route.
 */
export async function GET() {
  return respond(getItemStatusCounts);
}
