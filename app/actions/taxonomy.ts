"use server";

import { getActor, getSupabase, writeAudit } from "@/lib/data/helpers";
import type { AuditEntry, Category } from "@/lib/types";

/**
 * Category and unit-of-measure management (the Settings page). Ports the
 * client-side validation the in-memory store used (empty / length / duplicate /
 * in-use), now enforced against the database. Each success returns the created
 * or changed row plus an audit entry; the store adapts these to the
 * MutationResult the Settings UI already handles.
 */

export type CategoryResult =
  | { category: Category; activity: AuditEntry }
  | { error: string };
export type UnitResult =
  | { name: string; activity: AuditEntry }
  | { error: string };
export type DeleteResult = { ok: true; activity: AuditEntry } | { error: string };

async function nameExists(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  table: "categories" | "units",
  name: string
): Promise<boolean> {
  const { data } = await supabase.from(table).select("id").ilike("name", name);
  return (data ?? []).length > 0;
}

// --- Categories -----------------------------------------------------------

export async function addCategory(value: string): Promise<CategoryResult> {
  const name = value.trim();
  if (!name) return { error: "Category name can't be empty." };
  if (name.length > 40)
    return { error: "Category name must be 40 characters or fewer." };

  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  if (await nameExists(supabase, "categories", name))
    return { error: `"${name}" already exists.` };

  const { data, error } = await supabase
    .from("categories")
    .insert({ name })
    .select("id, name, created_at")
    .single();

  if (error || !data) {
    console.error("[taxonomy] add category failed", error);
    return { error: "Couldn't add the category. Try again." };
  }

  const activity = await writeAudit(supabase, actor, "Settings", name, "Added category.");
  return { category: data as Category, activity };
}

export async function renameCategory(
  from: string,
  to: string
): Promise<CategoryResult> {
  const name = to.trim();
  if (!name) return { error: "Category name can't be empty." };
  if (name.length > 40)
    return { error: "Category name must be 40 characters or fewer." };

  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const { data: existing } = await supabase
    .from("categories")
    .select("id, name, created_at")
    .eq("name", from)
    .maybeSingle();
  if (!existing) return { error: "That category no longer exists." };

  if (await nameExists(supabase, "categories", name))
    return { error: `"${name}" already exists.` };

  const { data, error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", existing.id)
    .select("id, name, created_at")
    .single();

  if (error || !data) {
    console.error("[taxonomy] rename category failed", error);
    return { error: "Couldn't rename the category. Try again." };
  }

  const activity = await writeAudit(
    supabase,
    actor,
    "Settings",
    name,
    `Renamed category from "${from}".`
  );
  return { category: data as Category, activity };
}

export async function deleteCategory(name: string): Promise<DeleteResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (!cat) return { error: "That category no longer exists." };

  const { count } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", cat.id);

  if (count && count > 0)
    return {
      error: `"${name}" is used by ${count} item${count === 1 ? "" : "s"}. Reassign or rename them first.`,
    };

  const { error } = await supabase.from("categories").delete().eq("id", cat.id);
  if (error) {
    console.error("[taxonomy] delete category failed", error);
    return { error: "Couldn't delete the category. Try again." };
  }

  const activity = await writeAudit(supabase, actor, "Settings", name, "Deleted category.");
  return { ok: true, activity };
}

// --- Units ----------------------------------------------------------------

export async function addUnit(value: string): Promise<UnitResult> {
  const name = value.trim();
  if (!name) return { error: "Unit name can't be empty." };
  if (name.length > 40)
    return { error: "Unit name must be 40 characters or fewer." };

  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  if (await nameExists(supabase, "units", name))
    return { error: `"${name}" already exists.` };

  const { error } = await supabase.from("units").insert({ name });
  if (error) {
    console.error("[taxonomy] add unit failed", error);
    return { error: "Couldn't add the unit. Try again." };
  }

  const activity = await writeAudit(supabase, actor, "Settings", name, "Added unit.");
  return { name, activity };
}

export async function renameUnit(from: string, to: string): Promise<UnitResult> {
  const name = to.trim();
  if (!name) return { error: "Unit name can't be empty." };
  if (name.length > 40)
    return { error: "Unit name must be 40 characters or fewer." };

  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  if (await nameExists(supabase, "units", name))
    return { error: `"${name}" already exists.` };

  const { error } = await supabase.from("units").update({ name }).eq("name", from);
  if (error) {
    console.error("[taxonomy] rename unit failed", error);
    return { error: "Couldn't rename the unit. Try again." };
  }

  // Unit name is denormalized onto items — keep them in sync.
  await supabase
    .from("inventory_items")
    .update({ unit_of_measure: name })
    .eq("unit_of_measure", from);

  const activity = await writeAudit(
    supabase,
    actor,
    "Settings",
    name,
    `Renamed unit from "${from}".`
  );
  return { name, activity };
}

export async function deleteUnit(name: string): Promise<DeleteResult> {
  const supabase = await getSupabase();
  const actor = await getActor(supabase);
  if (!actor) return { error: "Your session expired. Sign in again." };

  const { count } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("unit_of_measure", name);

  if (count && count > 0)
    return {
      error: `"${name}" is used by ${count} item${count === 1 ? "" : "s"}. Reassign or rename them first.`,
    };

  const { error } = await supabase.from("units").delete().eq("name", name);
  if (error) {
    console.error("[taxonomy] delete unit failed", error);
    return { error: "Couldn't delete the unit. Try again." };
  }

  const activity = await writeAudit(
    supabase,
    actor,
    "Settings",
    name,
    "Deleted unit of measure."
  );
  return { ok: true, activity };
}
