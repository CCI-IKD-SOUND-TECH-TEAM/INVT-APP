import { respond } from "@/lib/api/handler";
import { getCheckSession } from "@/lib/data/checks";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return respond(() => getCheckSession(id));
}
