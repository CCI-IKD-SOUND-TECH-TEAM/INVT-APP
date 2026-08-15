import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { mapDefect, mapItem } from "@/lib/data/mappers";
import type { AuditActionType, AuditEntry, Defect, InventoryItem } from "@/lib/types";

/**
 * Shared server helpers for the inventory write actions
 * (app/actions/items.ts, defects.ts, taxonomy.ts). Each action resolves the
 * actor, mutates, writes an audit row, and re-reads the canonical row so the
 * client store can reconcile from real data.
 */

export type Actor = { id: string; full_name: string; email: string };

export async function getSupabase() {
  return createClient(await cookies());
}

export async function getActor(
  supabase: Awaited<ReturnType<typeof getSupabase>>
): Promise<Actor | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    full_name: profile?.full_name ?? user.email?.split("@")[0] ?? "Unknown",
    email: profile?.email ?? user.email ?? "",
  };
}

/** Insert one audit_log row and return it shaped as the UI's AuditEntry. */
export async function writeAudit(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  actor: Actor,
  actionType: AuditActionType,
  recordLabel: string,
  detail: string
): Promise<AuditEntry> {
  const { data } = await supabase
    .from("audit_log")
    .insert({
      user_id: actor.id,
      action_type: actionType,
      record_label: recordLabel,
      detail,
    })
    .select("id, occurred_at")
    .single();

  return {
    id: data?.id ?? crypto.randomUUID(),
    timestamp: data?.occurred_at ?? new Date().toISOString(),
    user: actor.full_name,
    actionType,
    recordLabel,
    detail,
  };
}

export async function fetchItemById(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  id: string
): Promise<InventoryItem> {
  const { data } = await supabase
    .from("inventory_items")
    .select("*, item_images(url, display_order), item_units(*)")
    .eq("id", id)
    .single();
  return mapItem(data as Record<string, unknown>);
}

/**
 * Recompute an item's status from its unit rows.
 *
 * The rule is "worst unit wins": one broken speaker makes the item Defective,
 * and the item only comes back once its last broken unit does. Both defect
 * writes and direct unit edits call this, so there is one rule rather than two.
 *
 * Deliberately NOT "stays Available while a sibling still works". Defective is
 * one word with one meaning across the whole app — the Defective Assets tile,
 * the filter chips and the `?status=Defective` links all read this column, so an
 * item that reported Available with a broken unit inside would vanish from
 * every one of them. How much of the item is out of service is carried
 * alongside the badge instead, by `defective_unit_count` on the list view.
 *
 * No-ops for an item with no units (its status is entered directly) and for a
 * Retired item (retiring is a deliberate act, not something a repair undoes).
 */
export async function rollupItemStatus(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  itemId: string,
  actorId: string
): Promise<void> {
  const [{ data: units }, { data: item }] = await Promise.all([
    supabase.from("item_units").select("status").eq("item_id", itemId),
    supabase
      .from("inventory_items")
      .select("status")
      .eq("id", itemId)
      .maybeSingle(),
  ]);

  const rows = (units ?? []) as { status: InventoryItem["status"] }[];
  const current = item?.status as InventoryItem["status"] | undefined;
  if (rows.length === 0 || !current || current === "Retired") return;

  const live = rows.filter((u) => u.status !== "Retired");

  let next: InventoryItem["status"];
  if (live.length === 0) {
    // Every unit retired one at a time. There is no hardware left in service,
    // and the quantity trigger has already taken the item to 0 — leaving it
    // Defective would strand an empty row in the Defective Assets count.
    // Reversible: the inventory list's reactivate action still applies.
    next = "Retired";
  } else if (live.some((u) => u.status === "Defective")) {
    // An unaddressed unit outranks one already in the shop.
    next = "Defective";
  } else if (live.some((u) => u.status === "Under Repair")) {
    next = "Under Repair";
  } else {
    // Every unit is usable again. Only clear a broken status — an item marked
    // In Use is still In Use.
    if (current !== "Defective" && current !== "Under Repair") return;
    next = "Available";
  }

  if (next === current) return;
  await supabase
    .from("inventory_items")
    .update({ status: next, updated_by: actorId })
    .eq("id", itemId);
}

export async function fetchDefectById(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  id: string
): Promise<Defect> {
  const [{ data: row }, { data: profs }] = await Promise.all([
    supabase
      .from("defects")
      .select("*, repair_events(id, status, note, user_id, created_at)")
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const nameById = new Map(
    (profs ?? []).map((p) => [p.id as string, p.full_name as string])
  );
  return mapDefect(row as Record<string, unknown>, nameById);
}
