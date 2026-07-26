import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/site-url";
import { isLowStock } from "@/lib/inventory";
import LowStockEmail, {
  type LowStockItem,
} from "@/lib/email/templates/low-stock";

/**
 * Daily low-stock digest — PRODUCT.md: "flag low stock before it becomes a
 * Sunday-morning problem." Scheduled from vercel.json.
 *
 * DORMANT UNTIL INVENTORY IS IN THE DATABASE. Inventory currently lives in
 * React state (lib/store.tsx + lib/mock-data.ts), which a server cron cannot
 * reach. This queries `inventory_items`; that table doesn't exist yet, so the
 * route returns `skipped` rather than erroring. It starts working the moment
 * the inventory migration lands — no changes needed here.
 *
 * Runs with the service-role client: cron has no user session, so there is no
 * RLS context to read under.
 */

/**
 * "Table doesn't exist" — expected until the inventory migration lands.
 * Two codes because two backends surface it differently: raw Postgres
 * (local direct connection) returns `42P01`; PostgREST (the hosted REST API,
 * which is what the deployed app hits) returns `PGRST205`.
 */
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

export async function GET(request: NextRequest) {
  // Vercel Cron sends this header; without it anyone could trigger the digest.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/low-stock] CRON_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    // Missing service-role key. Name it rather than letting the throw surface
    // as an opaque 500 in the cron logs.
    console.error("[cron/low-stock]", err);
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const { data: items, error } = await admin
    .from("inventory_items")
    .select(
      "item_name, quantity, minimum_stock_threshold, unit_of_measure, category_id, status"
    )
    .neq("status", "Retired");

  if (error) {
    if (error.code && MISSING_TABLE_CODES.has(error.code)) {
      // Expected until the inventory migration lands — not a failure.
      return NextResponse.json({
        skipped: "inventory_items table does not exist yet",
      });
    }
    console.error("[cron/low-stock] query failed", error);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }

  // Same predicate the four UI surfaces use, so the digest can never disagree
  // with what the app shows.
  const low = (items ?? []).filter(isLowStock);
  if (low.length === 0) {
    return NextResponse.json({ sent: false, reason: "nothing low" });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("email")
    .eq("is_active", true);

  const to = (profiles ?? []).map((p) => p.email).filter(Boolean);
  if (to.length === 0) {
    return NextResponse.json({ sent: false, reason: "no active recipients" });
  }

  const rows: LowStockItem[] = low.map((item) => ({
    itemName: item.item_name,
    quantity: item.quantity,
    threshold: item.minimum_stock_threshold ?? 0,
    unit: item.unit_of_measure ?? "",
    category: item.category_id ?? "",
  }));

  const result = await sendEmail({
    to,
    subject: `${low.length} item${low.length === 1 ? "" : "s"} low on stock`,
    react: LowStockEmail({ items: rows, url: `${siteUrl()}/inventory` }),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ sent: true, count: low.length });
}
