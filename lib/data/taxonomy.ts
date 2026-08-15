import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { TaxonomyUsage } from "@/lib/api-types";

/**
 * How many items each category, unit of measure and department is attached to.
 *
 * Settings renders these next to every taxonomy row, so the counts have to be
 * available synchronously — one grouped query beats one count request per term.
 */
export async function getTaxonomyUsage(): Promise<TaxonomyUsage> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("taxonomy_usage")
    .select("kind, name, count");

  if (error) throw new Error(`getTaxonomyUsage failed: ${error.message}`);

  const usage: TaxonomyUsage = { categories: {}, units: {}, departments: {} };
  const buckets: Record<string, Record<string, number>> = {
    category: usage.categories,
    unit: usage.units,
    department: usage.departments,
  };
  for (const row of data ?? []) {
    const bucket = buckets[row.kind as string];
    if (bucket) bucket[row.name as string] = row.count as number;
  }
  return usage;
}
