"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  logDefect as logDefectAction,
  markNotRepairable as markNotRepairableAction,
  resolveDefect as resolveDefectAction,
  startRepair as startRepairAction,
} from "@/app/actions/defects";
import { queryKeys } from "@/lib/queries/keys";
import type { Defect, InventoryItem } from "@/lib/types";

/**
 * Defect mutations.
 *
 * Every one of these also moves the item's status (logging a defect marks the
 * item Defective, resolving it puts it back), so they invalidate the item
 * branch as well as the defect branch — otherwise the inventory list would keep
 * showing a stale status until its own cache expired.
 */
function useDefectInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.defects.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.items.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
  };
}

export function useLogDefect() {
  const invalidate = useDefectInvalidation();
  return useMutation({
    mutationFn: async (input: {
      item_id: string;
      /** The affected unit; null logs the defect against the whole item. */
      item_unit_id?: string | null;
      description: string;
      severity: Defect["severity"];
      date_reported: string;
    }) => {
      const res = await logDefectAction(input);
      if ("error" in res) throw new Error(res.error);
      return res.defect;
    },
    onSuccess: invalidate,
  });
}

export function useStartRepair() {
  const invalidate = useDefectInvalidation();
  return useMutation({
    mutationFn: async (input: {
      defectId: string;
      repair_start_date: string;
      performing_party: string;
    }) => {
      const res = await startRepairAction(
        input.defectId,
        input.repair_start_date,
        input.performing_party
      );
      if ("error" in res) throw new Error(res.error);
      return res.defect;
    },
    onSuccess: invalidate,
  });
}

export function useResolveDefect() {
  const invalidate = useDefectInvalidation();
  return useMutation({
    mutationFn: async (input: {
      defectId: string;
      resolution_notes: string;
    }) => {
      const res = await resolveDefectAction(
        input.defectId,
        input.resolution_notes
      );
      if ("error" in res) throw new Error(res.error);
      return res.defect;
    },
    onSuccess: invalidate,
  });
}

export function useMarkNotRepairable() {
  const invalidate = useDefectInvalidation();
  return useMutation({
    mutationFn: async (input: {
      defectId: string;
      resolution_notes: string;
      followUp:
        | { action: "retire" }
        | { action: "set-status"; status: InventoryItem["status"] };
    }) => {
      const res = await markNotRepairableAction(
        input.defectId,
        input.resolution_notes,
        input.followUp
      );
      if ("error" in res) throw new Error(res.error);
      return res.defect;
    },
    onSuccess: invalidate,
  });
}
