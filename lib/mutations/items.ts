"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createItem as createItemAction,
  reactivateItem as reactivateItemAction,
  retireItem as retireItemAction,
  updateItem as updateItemAction,
} from "@/app/actions/items";
import { queryKeys } from "@/lib/queries/keys";
import type { ItemPatch, NewItemInput } from "@/lib/types";

/**
 * Item mutations.
 *
 * Writes stay as server actions — they audit-log, run under RLS, and want the
 * serialisation Next gives actions. What changes is what happens afterwards:
 * the store used to splice the returned row into a client array, and now the
 * affected query branches are invalidated instead.
 *
 * `["items"]` is the branch, so one invalidation covers every cached page,
 * filter combination, detail row and the status counts.
 */
function useItemInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.items.all() });
    // Counts and the activity feed both move when an item does.
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
  };
}

export function useRetireItem() {
  const invalidate = useItemInvalidation();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await retireItemAction(id);
      if ("error" in res) throw new Error(res.error);
      return res.item;
    },
    onSuccess: invalidate,
  });
}

export function useReactivateItem() {
  const invalidate = useItemInvalidation();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await reactivateItemAction(id);
      if ("error" in res) throw new Error(res.error);
      return res.item;
    },
    onSuccess: invalidate,
  });
}

export function useCreateItem() {
  const invalidate = useItemInvalidation();
  return useMutation({
    mutationFn: async (input: NewItemInput) => {
      const res = await createItemAction(input);
      if ("error" in res) throw new Error(res.error);
      return res.item;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateItem() {
  const invalidate = useItemInvalidation();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: ItemPatch;
    }) => {
      const res = await updateItemAction(id, patch);
      if ("error" in res) throw new Error(res.error);
      return res.item;
    },
    onSuccess: invalidate,
  });
}
