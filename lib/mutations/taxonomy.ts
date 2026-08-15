"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addCategory as addCategoryAction,
  addUnit as addUnitAction,
  deleteCategory as deleteCategoryAction,
  deleteUnit as deleteUnitAction,
  renameCategory as renameCategoryAction,
  renameUnit as renameUnitAction,
} from "@/app/actions/taxonomy";
import { logAccessEmail as logAccessEmailAction } from "@/app/actions/audit";
import { queryKeys } from "@/lib/queries/keys";

/**
 * Taxonomy mutations.
 *
 * Settings calls these through a shared `MutationResult` shape — `{ ok: true }`
 * or `{ ok: false, error }` — rather than throwing, because the panel renders
 * the message inline next to the row being edited. That contract is preserved
 * here so the Settings UI did not have to change shape.
 */
export type MutationResult = { ok: true } | { ok: false; error: string };

function useTaxonomyInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    // Reference holds the name lists; usage holds the counts beside them.
    queryClient.invalidateQueries({ queryKey: queryKeys.reference() });
    queryClient.invalidateQueries({ queryKey: queryKeys.taxonomyUsage() });
    // A unit rename rewrites unit_of_measure across items.
    queryClient.invalidateQueries({ queryKey: queryKeys.items.all() });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
  };
}

/** Wraps an action that returns `{ error }` into the panel's result shape. */
function useTaxonomyMutation<TArgs extends unknown[]>(
  action: (...args: TArgs) => Promise<{ error?: string } & object>
) {
  const invalidate = useTaxonomyInvalidation();

  const mutation = useMutation({
    mutationFn: async (args: TArgs): Promise<MutationResult> => {
      const res = await action(...args);
      if ("error" in res && res.error) return { ok: false, error: res.error };
      return { ok: true };
    },
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  return (...args: TArgs) => mutation.mutateAsync(args);
}

export function useTaxonomyMutations() {
  return {
    addCategory: useTaxonomyMutation<[string]>(addCategoryAction),
    renameCategory: useTaxonomyMutation<[string, string]>(renameCategoryAction),
    deleteCategory: useTaxonomyMutation<[string]>(deleteCategoryAction),
    addUnit: useTaxonomyMutation<[string]>(addUnitAction),
    renameUnit: useTaxonomyMutation<[string, string]>(renameUnitAction),
    deleteUnit: useTaxonomyMutation<[string]>(deleteUnitAction),
  };
}

export function useLogAccessEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; kind: "invite" | "sign-in" }) => {
      const res = await logAccessEmailAction(input.name, input.kind);
      if ("error" in res) throw new Error(res.error);
      return res.activity;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["activity"] }),
  });
}
