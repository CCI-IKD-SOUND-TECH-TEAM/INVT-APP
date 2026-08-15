import { intParam, respond } from "@/lib/api/handler";
import { getActivity } from "@/lib/data/activity";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // Bounded: this endpoint is public to any signed-in caller, and an unbounded
  // limit would let one request pull the entire audit log.
  const limit = Math.min(Math.max(intParam(params, "limit", 10), 1), 200);
  return respond(() => getActivity(limit));
}
