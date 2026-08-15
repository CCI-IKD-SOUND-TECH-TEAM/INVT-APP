"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { referenceQuery } from "@/lib/queries";
import type { Category, Department, Profile } from "@/lib/types";

/**
 * The id → label surface every screen needs, backed by one long-lived query.
 *
 * This is deliberately the same shape the store exposed (categoryName,
 * departmentIdByName, the canonically-ordered `departments` list, …) so a
 * component migrating off `useStore()` swaps the hook and changes nothing else.
 *
 * Reference data is the one slice that stays global: it is small, shared by
 * every route, and changes a few times a year. Entity data does not live here.
 */
export interface ReferenceValue {
  categoryList: Category[];
  departmentList: Department[];
  profiles: Profile[];

  /** Sorted display names. */
  categories: string[];
  /** Canonical order — Sound leads; unknown departments follow alphabetically. */
  departments: string[];
  units: string[];
  users: string[];

  categoryName: (id: string) => string;
  departmentName: (id: string) => string;
  profileName: (id: string) => string;
  categoryIdByName: (name: string) => string | undefined;
  departmentIdByName: (name: string) => string | undefined;

  isLoading: boolean;
}

const DEPARTMENT_ORDER = ["Sound", "Light", "Projection"];

export function useReference(): ReferenceValue {
  const { data, isLoading } = useQuery(referenceQuery());

  const categoryList = useMemo(() => data?.categories ?? [], [data]);
  const departmentList = useMemo(() => data?.departments ?? [], [data]);
  const profiles = useMemo(() => data?.profiles ?? [], [data]);
  const units = useMemo(() => data?.units ?? [], [data]);

  return useMemo(() => {
    // Maps rather than repeated .find() — these lookups run once per rendered
    // row, and the store's linear scans were O(rows × categories).
    const categoryById = new Map(categoryList.map((c) => [c.id, c.name]));
    const categoryByName = new Map(categoryList.map((c) => [c.name, c.id]));
    const departmentById = new Map(departmentList.map((d) => [d.id, d.name]));
    const departmentByName = new Map(departmentList.map((d) => [d.name, d.id]));
    const profileById = new Map(profiles.map((p) => [p.id, p.full_name]));

    return {
      categoryList,
      departmentList,
      profiles,

      categories: categoryList
        .map((c) => c.name)
        .sort((a, b) => a.localeCompare(b)),

      departments: departmentList
        .map((d) => d.name)
        .sort((a, b) => {
          const ai = DEPARTMENT_ORDER.indexOf(a);
          const bi = DEPARTMENT_ORDER.indexOf(b);
          if (ai !== -1 || bi !== -1) {
            return (
              (ai === -1 ? DEPARTMENT_ORDER.length : ai) -
              (bi === -1 ? DEPARTMENT_ORDER.length : bi)
            );
          }
          return a.localeCompare(b);
        }),

      units,
      users: profiles.map((p) => p.full_name),

      categoryName: (id) => categoryById.get(id) ?? "—",
      departmentName: (id) => departmentById.get(id) ?? "—",
      // Falls back to the id, matching the store — a missing profile shows
      // something traceable rather than an em dash.
      profileName: (id) => profileById.get(id) ?? id,
      categoryIdByName: (name) => categoryByName.get(name),
      departmentIdByName: (name) => departmentByName.get(name),

      isLoading,
    };
  }, [categoryList, departmentList, profiles, units, isLoading]);
}
