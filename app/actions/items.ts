"use server";

import {
  fetchItemById,
  getActor,
  getSupabase,
  writeAudit,
} from "@/lib/data/helpers";
import type { AuditEntry, InventoryItem, NewItemInput } from "@/lib/types";

/**
 * Inventory item writes. Each returns the canonical row (re-read after the
 * write) plus any audit entry it created, so the client store reconciles from
 * real data rather than an optimistic guess. `{ error }` on failure.
 */

export type ItemResult =
  | { item: InventoryItem; activity?: AuditEntry }
  | { error: string };

// Columns a client patch is allowed to write. Everything else (id, timestamps,
// created_by, images) is server-controlled or handled separately.
const ITEM_COLUMNS = new Set([
  "item_name",
  "description",
  "category_id",
  "department_id",
  "quantity",
  "minimum_stock_threshold",
  "status",
  "location",
  "date_acquired",
  "remarks",
  "serial_number",
  "unit_of_measure",
  "asset_type",
]);

async function replaceImages(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  itemId: string,
  urls: string[]
) {
  await supabase.from("item_images").delete().eq("item_id", itemId);
  if (urls.length === 0) return;
  await supabase.from("item_images").insert(
    urls.map((url, i) => ({ item_id: itemId, url, display_order: i }))
  );
}

export async function createItem(input: NewItemInput): Promise<ItemResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      item_name: input.item_name,
      description: input.description ?? null,
      category_id: input.category_id,
      department_id: input.department_id,
      quantity: input.quantity,
      minimum_stock_threshold: input.minimum_stock_threshold ?? null,
      status: "Available",
      location: input.location ?? null,
      date_acquired: input.date_acquired ?? null,
      remarks: input.remarks ?? null,
      serial_number: input.serial_number ?? null,
      unit_of_measure: input.unit_of_measure,
      asset_type: input.asset_type,
      created_by: actor.id,
      updated_by: actor.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[items] create failed", error);
    return { error: "Couldn't save the item. Try again." };
  }

  await replaceImages(supabase, data.id, input.images ?? []);
  const activity = await writeAudit(
    supabase,
    actor,
    "Create",
    input.item_name,
    "Added new item to inventory."
  );
  const item = await fetchItemById(supabase, data.id);
  return { item, activity };
}

export async function updateItem(
  id: string,
  patch: Partial<InventoryItem>
): Promise<ItemResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const update: Record<string, unknown> = { updated_by: actor.id };
  for (const [key, value] of Object.entries(patch)) {
    if (ITEM_COLUMNS.has(key)) update[key] = value ?? null;
  }

  const { error } = await supabase
    .from("inventory_items")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[items] update failed", error);
    return { error: "Couldn't save changes. Try again." };
  }

  if (patch.images) await replaceImages(supabase, id, patch.images);

  const item = await fetchItemById(supabase, id);
  return { item };
}

async function setStatus(
  id: string,
  status: InventoryItem["status"],
  actionType: "Retire" | "Reactivate",
  detail: string
): Promise<ItemResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const { data, error } = await supabase
    .from("inventory_items")
    .update({ status, updated_by: actor.id })
    .eq("id", id)
    .select("item_name")
    .single();

  if (error || !data) {
    console.error("[items] status change failed", error);
    return { error: "Couldn't update the item. Try again." };
  }

  const activity = await writeAudit(
    supabase,
    actor,
    actionType,
    data.item_name as string,
    detail
  );
  const item = await fetchItemById(supabase, id);
  return { item, activity };
}

export async function retireItem(id: string): Promise<ItemResult> {
  return setStatus(id, "Retired", "Retire", "Item retired (soft-deleted).");
}

export async function reactivateItem(id: string): Promise<ItemResult> {
  return setStatus(
    id,
    "Available",
    "Reactivate",
    "Item reactivated — status set to Available."
  );
}
