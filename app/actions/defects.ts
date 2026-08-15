"use server";

import { after } from "next/server";
import {
  fetchDefectById,
  fetchItemById,
  getActor,
  getSupabase,
  rollupItemStatus,
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
 * row, moves the status of whatever the defect is against, writes an audit
 * entry, and (on log / close) fires the email notification via `after()` so a
 * slow mail send never blocks the response. Returns the updated defect + item +
 * audit entry so the client store reconciles both in one round-trip.
 *
 * "Whatever the defect is against" is the part that isn't obvious: a defect
 * carries an optional `item_unit_id`. When it is set, the status change lands
 * on that one unit and the item's own status is recomputed from all of them —
 * so one defective speaker no longer marks its working twin Defective. When it
 * is null the defect is against the whole item and the status is written
 * directly, exactly as before units existed.
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

/** What a defect points at: the whole item, or one unit inside it. */
type DefectTarget = { item_id: string; item_unit_id: string | null };

/**
 * The name to put in the audit trail and the notification email. A unit-scoped
 * defect reads "QSC K12.2 — Speaker 2" so the record says which one, not just
 * which model.
 */
async function targetName(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  target: DefectTarget
): Promise<string> {
  const name = await itemName(supabase, target.item_id);
  if (!target.item_unit_id) return name;

  const { data } = await supabase
    .from("item_units")
    .select("label")
    .eq("id", target.item_unit_id)
    .maybeSingle();

  return data?.label ? `${name} — ${data.label as string}` : name;
}

/**
 * Move the status of whatever the defect is against.
 *
 * Unit-scoped: write the unit, then let the rollup decide the item's status —
 * it stays Available while any sibling unit still works. Item-scoped: write the
 * item directly.
 */
async function applyStatus(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  target: DefectTarget,
  status: InventoryItem["status"],
  actorId: string
): Promise<void> {
  if (target.item_unit_id) {
    await supabase
      .from("item_units")
      .update({ status })
      .eq("id", target.item_unit_id);
    await rollupItemStatus(supabase, target.item_id, actorId);
    return;
  }

  await supabase
    .from("inventory_items")
    .update({ status, updated_by: actorId })
    .eq("id", target.item_id);
}

export async function logDefect(input: {
  item_id: string;
  /** The specific unit that's broken; null logs it against the whole item. */
  item_unit_id?: string | null;
  description: string;
  severity: DefectSeverity;
  date_reported: string;
}): Promise<DefectResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const target: DefectTarget = {
    item_id: input.item_id,
    item_unit_id: input.item_unit_id ?? null,
  };

  const { data: defectRow, error } = await supabase
    .from("defects")
    .insert({
      item_id: input.item_id,
      item_unit_id: target.item_unit_id,
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
  await applyStatus(supabase, target, "Defective", actor.id);

  const name = await targetName(supabase, target);
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
    .select("item_id, item_unit_id")
    .single();

  if (error || !defectRow) {
    console.error("[defects] start repair failed", error);
    return { error: "Couldn't start the repair. Try again." };
  }

  const target = defectRow as DefectTarget;
  const party = performing_party || "unspecified party";
  await appendEvent(
    supabase,
    defectId,
    "Under Repair",
    `Repair started with ${party}.`,
    actor.id
  );
  await applyStatus(supabase, target, "Under Repair", actor.id);

  const name = await targetName(supabase, target);
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
    .select("item_id, item_unit_id")
    .single();

  if (error || !defectRow) {
    console.error("[defects] resolve failed", error);
    return { error: "Couldn't resolve the defect. Try again." };
  }

  const target = defectRow as DefectTarget;
  await appendEvent(supabase, defectId, "Resolved", resolution_notes, actor.id);
  await applyStatus(supabase, target, "Available", actor.id);

  const name = await targetName(supabase, target);
  const [defect, item] = await Promise.all([
    fetchDefectById(supabase, defectId),
    fetchItemById(supabase, defectRow.item_id as string),
  ]);

  // Read the item's status back rather than assuming "Available": on a
  // unit-scoped defect the rollup decides it, and the item can legitimately
  // stay Defective because a second unit is still broken.
  const activity = await writeAudit(
    supabase,
    actor,
    "Repair Status Change",
    name,
    `Defect marked Resolved — ${target.item_unit_id ? "unit" : "item"} returned to Available.`
  );

  after(() =>
    notifyDefectClosed({
      actorId: actor.id,
      actorName: actor.full_name,
      itemName: name,
      outcome: "Resolved",
      resolutionNotes: resolution_notes,
      itemStatus: item.status,
    })
  );

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
    .select("item_id, item_unit_id")
    .single();

  if (error || !defectRow) {
    console.error("[defects] not-repairable failed", error);
    return { error: "Couldn't update the defect. Try again." };
  }

  const target = defectRow as DefectTarget;
  const nextStatus =
    followUp.action === "retire" ? "Retired" : followUp.status;

  await appendEvent(
    supabase,
    defectId,
    "Not Repairable",
    resolution_notes,
    actor.id
  );
  // Retiring a unit-scoped defect retires that unit, not the whole item — the
  // other speaker is still good. The trigger drops the item's quantity to
  // match, and the rollup re-decides the item's status.
  await applyStatus(supabase, target, nextStatus, actor.id);

  const name = await targetName(supabase, target);
  const [defect, item] = await Promise.all([
    fetchDefectById(supabase, defectId),
    fetchItemById(supabase, defectRow.item_id as string),
  ]);

  const activity = await writeAudit(
    supabase,
    actor,
    "Repair Status Change",
    name,
    `Defect marked Not Repairable — ${target.item_unit_id ? "unit" : "item"} set to ${nextStatus}.`
  );

  after(() =>
    notifyDefectClosed({
      actorId: actor.id,
      actorName: actor.full_name,
      itemName: name,
      outcome: "Not Repairable",
      resolutionNotes: resolution_notes,
      itemStatus: item.status,
    })
  );
  return { defect, item, activity };
}
