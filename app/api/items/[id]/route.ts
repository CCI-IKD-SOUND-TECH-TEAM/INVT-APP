import { respond } from "@/lib/api/handler";
import { getItemById } from "@/lib/data/items";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return respond(() => getItemById(id));
}
