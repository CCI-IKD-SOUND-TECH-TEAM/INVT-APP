import { respond } from "@/lib/api/handler";
import { getItemOptions } from "@/lib/data/items";

export async function GET() {
  return respond(getItemOptions);
}
