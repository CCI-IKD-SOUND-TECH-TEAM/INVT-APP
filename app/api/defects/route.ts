import { respond } from "@/lib/api/handler";
import { getDefects } from "@/lib/data/defects";
import type { DefectStatus } from "@/lib/types";

const STATUSES: DefectStatus[] = [
  "Open",
  "Under Repair",
  "Resolved",
  "Not Repairable",
];

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("status") as
    | DefectStatus
    | null;
  const status = raw && STATUSES.includes(raw) ? raw : undefined;
  return respond(() => getDefects(status));
}
