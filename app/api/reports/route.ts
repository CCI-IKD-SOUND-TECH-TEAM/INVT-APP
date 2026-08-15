import { respond } from "@/lib/api/handler";
import { getReportsDataset } from "@/lib/data/reports";

export async function GET() {
  return respond(getReportsDataset);
}
