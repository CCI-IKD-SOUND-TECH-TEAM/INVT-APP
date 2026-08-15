import { intParam, respond } from "@/lib/api/handler";
import { getChecks } from "@/lib/data/checks";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const weeks = Math.min(Math.max(intParam(params, "weeks", 12), 1), 104);
  return respond(() => getChecks(weeks));
}
