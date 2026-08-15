import "server-only";

import type { getSupabase } from "@/lib/data/helpers";
import type { ItemUnitInput } from "@/lib/types";

/**
 * Reconciling an item's unit list against what the form submitted.
 *
 * Shared by the item write actions (app/actions/items.ts, which saves units
 * alongside the rest of the form) and the unit actions (app/actions/units.ts).
 * It lives here rather than in either one so neither has to import the other.
 *
 * Reconciling rather than delete-and-reinsert is what keeps unit ids stable: a
 * defect points at a unit, and re-creating the row would orphan that link.
 * `inventory_items.quantity` is deliberately untouched — a trigger (migration
 * 0010) derives it from the surviving non-retired rows.
 */

type Supabase = Awaited<ReturnType<typeof getSupabase>>;

/** Postgres unique-violation — the serial is already on another unit. */
const UNIQUE_VIOLATION = "23505";

/** Returns a user-facing message, or null when the list is valid. */
export function validateUnits(units: ItemUnitInput[]): string | null {
  for (const unit of units) {
    if (!unit.label.trim()) return "Every unit needs a label.";
    if (unit.label.length > 60)
      return "Unit labels must be 60 characters or fewer.";
    if ((unit.serial_number ?? "").length > 100)
      return "Serial numbers must be 100 characters or fewer.";
  }

  // Checked here as well as by the unique index so the message can name the
  // duplicate — the index only reports a constraint name.
  const seen = new Set<string>();
  for (const unit of units) {
    const serial = unit.serial_number?.trim();
    if (!serial) continue;
    const key = serial.toLowerCase();
    if (seen.has(key))
      return `Serial number "${serial}" is on more than one unit. Each unit needs its own.`;
    seen.add(key);
  }

  return null;
}

/**
 * Make `item_units` for `itemId` match `units`: rows carrying an id are
 * updated, rows without one are inserted, and rows the list no longer carries
 * are deleted. An empty list removes every unit and returns the item to a plain
 * quantity group.
 *
 * Returns a user-facing error message, or null on success.
 */
export async function reconcileItemUnits(
  supabase: Supabase,
  itemId: string,
  units: ItemUnitInput[]
): Promise<string | null> {
  const invalid = validateUnits(units);
  if (invalid) return invalid;

  const { data: existingRows, error: readErr } = await supabase
    .from("item_units")
    .select("id")
    .eq("item_id", itemId);

  if (readErr) {
    console.error("[units] read failed", readErr);
    return "Couldn't load this item's units. Try again.";
  }

  const existing = (existingRows ?? []).map((r) => r.id as string);
  const kept = new Set(units.map((u) => u.id).filter(Boolean) as string[]);
  const removed = existing.filter((id) => !kept.has(id));

  // Deletes run first: a unit being removed may hold the serial a new unit is
  // about to take, and the unique index spans the whole table.
  if (removed.length > 0) {
    const { error } = await supabase
      .from("item_units")
      .delete()
      .in("id", removed);
    if (error) {
      console.error("[units] delete failed", error);
      return "Couldn't remove a unit. Try again.";
    }
  }

  for (const unit of units) {
    const row = {
      item_id: itemId,
      label: unit.label.trim(),
      serial_number: unit.serial_number?.trim() || null,
      status: unit.status,
      notes: unit.notes?.trim() || null,
    };

    // An id the caller invented (or one belonging to another item) inserts as
    // a new row rather than updating something it doesn't own.
    const { error } =
      unit.id && existing.includes(unit.id)
        ? await supabase.from("item_units").update(row).eq("id", unit.id)
        : await supabase.from("item_units").insert(row);

    if (error) {
      console.error("[units] write failed", error);
      if (error.code === UNIQUE_VIOLATION) {
        return `Serial number "${row.serial_number}" is already on another item.`;
      }
      return "Couldn't save the units. Try again.";
    }
  }

  return null;
}
