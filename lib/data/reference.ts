import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Reference } from "@/lib/api-types";
import type { Category, Department, Profile } from "@/lib/types";

/**
 * The four taxonomy tables every screen needs to turn ids into labels.
 *
 * Small, user-independent, and changed a few times a year — so this is the one
 * read that is genuinely worth caching hard on the client (an hour) rather than
 * refetching per route.
 */
export type { Reference } from "@/lib/api-types";

export async function getReference(): Promise<Reference> {
  const supabase = createClient(await cookies());

  const [
    { data: categories, error: catErr },
    { data: departments, error: depErr },
    { data: units, error: unitErr },
    { data: profiles, error: profErr },
  ] = await Promise.all([
    supabase.from("categories").select("id, name, created_at").order("name"),
    supabase.from("departments").select("id, name, created_at").order("name"),
    supabase.from("units").select("name").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email, is_active, last_login_at, created_at")
      .order("full_name"),
  ]);

  const error = catErr ?? depErr ?? unitErr ?? profErr;
  if (error) throw new Error(`getReference failed: ${error.message}`);

  return {
    categories: (categories ?? []) as Category[],
    departments: (departments ?? []) as Department[],
    units: (units ?? []).map((u) => u.name as string),
    profiles: (profiles ?? []) as Profile[],
  };
}
