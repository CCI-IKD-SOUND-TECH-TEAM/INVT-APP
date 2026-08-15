import { respond } from "@/lib/api/handler";
import { getTaxonomyUsage } from "@/lib/data/taxonomy";

export async function GET() {
  return respond(getTaxonomyUsage);
}
