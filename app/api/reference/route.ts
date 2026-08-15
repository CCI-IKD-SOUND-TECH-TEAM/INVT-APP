import { respond } from "@/lib/api/handler";
import { getReference } from "@/lib/data/reference";

export async function GET() {
  return respond(getReference);
}
