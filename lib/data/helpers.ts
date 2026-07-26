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
    .select("*, item_images(url, display_order)")
    .eq("id", id)
    .single();
  return mapItem(data as Record<string, unknown>);
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
