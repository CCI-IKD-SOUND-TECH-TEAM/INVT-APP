import { respond } from "@/lib/api/handler";
import { getDashboardStats } from "@/lib/data/dashboard";

export async function GET() {
  return respond(getDashboardStats);
}
