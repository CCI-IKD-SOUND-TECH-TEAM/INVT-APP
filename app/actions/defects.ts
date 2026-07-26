"use server";

import { after } from "next/server";
import {
  fetchDefectById,
  fetchItemById,
  getActor,
  getSupabase,
  writeAudit,
} from "@/lib/data/helpers";
import { notifyDefectClosed, notifyDefectLogged } from "@/app/actions/notifications";
import type {
  AuditEntry,
  Defect,
  DefectSeverity,
  InventoryItem,
} from "@/lib/types";

/**
 * Defect lifecycle writes. Each mutates the defect, appends a repair_events
 * row, flips the parent item's status, writes an audit entry, and (on log /
 * close) fires the email notification via `after()` so a slow mail send never
 * blocks the response. Returns the updated defect + item + audit entry so the
 * client store reconciles both in one round-trip.
 */

export type DefectResult =
  | { defect: Defect; item: InventoryItem; activity: AuditEntry }
  | { error: string };

async function appendEvent(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  defectId: string,
  status: Defect["status"],
  note: string | null,
  userId: string
) {
  await supabase.from("repair_events").insert({
    defect_id: defectId,
    status,
    note,
    user_id: userId,
  });
}

async function itemName(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  itemId: string
): Promise<string> {
  const { data } = await supabase
    .from("inventory_items")
    .select("item_name")
    .eq("id", itemId)
    .single();
  return (data?.item_name as string) ?? "Item";
}

export async function logDefect(input: {
  item_id: string;
  description: string;
  severity: DefectSeverity;
  date_reported: string;
}): Promise<DefectResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const { data: defectRow, error } = await supabase
    .from("defects")
    .insert({
      item_id: input.item_id,
      description: input.description,
      date_reported: input.date_reported,
      reported_by: actor.id,
      severity: input.severity,
      status: "Open",
    })
    .select("id")
    .single();

  if (error || !defectRow) {
    console.error("[defects] log failed", error);
    return { error: "Couldn't log the defect. Try again." };
  }

  await appendEvent(supabase, defectRow.id, "Open", null, actor.id);
  await supabase
    .from("inventory_items")
    .update({ status: "Defective", updated_by: actor.id })
    .eq("id", input.item_id);

  const name = await itemName(supabase, input.item_id);
  const trimmed =
    input.description.length > 60
      ? `${input.description.slice(0, 60)}…`
      : input.description;
  const activity = await writeAudit(
    supabase,
    actor,
    "Defect",
    name,
    `Logged defect — ${trimmed}`
  );

  after(() =>
    notifyDefectLogged({
      actorId: actor.id,
      actorName: actor.full_name,
      itemName: name,
      severity: input.severity,
      description: input.description,
      dateReported: input.date_reported,
    })
  );

  const [defect, item] = await Promise.all([
    fetchDefectById(supabase, defectRow.id),
    fetchItemById(supabase, input.item_id),
  ]);
  return { defect, item, activity };
}

export async function startRepair(
  defectId: string,
  repair_start_date: string,
  performing_party: string
): Promise<DefectResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const { data: defectRow, error } = await supabase
    .from("defects")
    .update({
      status: "Under Repair",
      repair_start_date,
      performing_party,
    })
    .eq("id", defectId)
    .select("item_id")
    .single();

  if (error || !defectRow) {
    console.error("[defects] start repair failed", error);
    return { error: "Couldn't start the repair. Try again." };
  }

  const party = performing_party || "unspecified party";
  await appendEvent(
    supabase,
    defectId,
    "Under Repair",
    `Repair started with ${party}.`,
    actor.id
  );
  await supabase
    .from("inventory_items")
    .update({ status: "Under Repair", updated_by: actor.id })
    .eq("id", defectRow.item_id);

  const name = await itemName(supabase, defectRow.item_id as string);
  const activity = await writeAudit(
    supabase,
    actor,
    "Repair Status Change",
    name,
    `Defect moved to Under Repair — ${party}.`
  );

  const [defect, item] = await Promise.all([
    fetchDefectById(supabase, defectId),
    fetchItemById(supabase, defectRow.item_id as string),
  ]);
  return { defect, item, activity };
}

export async function resolveDefect(
  defectId: string,
  resolution_notes: string
): Promise<DefectResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const { data: defectRow, error } = await supabase
    .from("defects")
    .update({ status: "Resolved", resolution_notes })
    .eq("id", defectId)
    .select("item_id")
    .single();

  if (error || !defectRow) {
    console.error("[defects] resolve failed", error);
    return { error: "Couldn't resolve the defect. Try again." };
  }

  await appendEvent(supabase, defectId, "Resolved", resolution_notes, actor.id);
  await supabase
    .from("inventory_items")
    .update({ status: "Available", updated_by: actor.id })
    .eq("id", defectRow.item_id);

  const name = await itemName(supabase, defectRow.item_id as string);
  const activity = await writeAudit(
    supabase,
    actor,
    "Repair Status Change",
    name,
    "Defect marked Resolved — item returned to Available."
  );

  after(() =>
    notifyDefectClosed({
      actorId: actor.id,
      actorName: actor.full_name,
      itemName: name,
      outcome: "Resolved",
      resolutionNotes: resolution_notes,
      itemStatus: "Available",
    })
  );

  const [defect, item] = await Promise.all([
    fetchDefectById(supabase, defectId),
    fetchItemById(supabase, defectRow.item_id as string),
  ]);
  return { defect, item, activity };
}

export async function markNotRepairable(
  defectId: string,
  resolution_notes: string,
  followUp:
    | { action: "retire" }
    | { action: "set-status"; status: InventoryItem["status"] }
): Promise<DefectResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const { data: defectRow, error } = await supabase
    .from("defects")
    .update({ status: "Not Repairable", resolution_notes })
    .eq("id", defectId)
    .select("item_id")
    .single();

  if (error || !defectRow) {
    console.error("[defects] not-repairable failed", error);
    return { error: "Couldn't update the defect. Try again." };
  }

  const nextStatus =
    followUp.action === "retire" ? "Retired" : followUp.status;

  await appendEvent(
    supabase,
    defectId,
    "Not Repairable",
    resolution_notes,
    actor.id
  );
  await supabase
    .from("inventory_items")
    .update({ status: nextStatus, updated_by: actor.id })
    .eq("id", defectRow.item_id);

  const name = await itemName(supabase, defectRow.item_id as string);
  const activity = await writeAudit(
    supabase,
    actor,
    "Repair Status Change",
    name,
    `Defect marked Not Repairable — item set to ${nextStatus}.`
  );

  after(() =>
    notifyDefectClosed({
      actorId: actor.id,
      actorName: actor.full_name,
      itemName: name,
      outcome: "Not Repairable",
      resolutionNotes: resolution_notes,
      itemStatus: nextStatus,
    })
  );

  const [defect, item] = await Promise.all([
    fetchDefectById(supabase, defectId),
    fetchItemById(supabase, defectRow.item_id as string),
  ]);
  return { defect, item, activity };
}
