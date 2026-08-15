import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { mapDefect } from "@/lib/data/mappers";
import type { DefectWithItem } from "@/lib/api-types";
import type { DefectStatus } from "@/lib/types";

export type { DefectWithItem } from "@/lib/api-types";

export async function getDefects(
  status?: DefectStatus
): Promise<DefectWithItem[]> {
  const supabase = createClient(await cookies());

  let query = supabase
    .from("defects")
    .select(
      "*, repair_events(id, status, note, user_id, created_at), inventory_items(item_name, category_id), item_units(label, serial_number)"
    )
    .order("date_reported", { ascending: false });

  if (status) query = query.eq("status", status);

  const [{ data, error }, { data: profileRows, error: profErr }] =
    await Promise.all([
      query,
      // mapDefect resolves repair-event user ids to names.
      supabase.from("profiles").select("id, full_name"),
    ]);

  const failure = error ?? profErr;
  if (failure) throw new Error(`getDefects failed: ${failure.message}`);

  const nameById = new Map(
    (profileRows ?? []).map((p) => [p.id as string, p.full_name as string])
  );

  return (data ?? []).map((row) => {
    const item = row.inventory_items as {
      item_name: string;
      category_id: string;
    } | null;
    // Null whenever the defect is against the whole item rather than one unit.
    const unit = row.item_units as {
      label: string;
      serial_number: string | null;
    } | null;
    return {
      ...mapDefect(row, nameById),
      item_name: item?.item_name ?? "Unknown item",
      category_id: item?.category_id ?? "",
      unit_label: unit?.label ?? null,
      unit_serial_number: unit?.serial_number ?? null,
    };
  });
}
