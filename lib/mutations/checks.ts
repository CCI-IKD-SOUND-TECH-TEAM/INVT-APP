"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  abandonCheckSession as abandonCheckSessionAction,
  bulkMarkRemainingPresent as bulkMarkRemainingPresentAction,
  completeCheckSession as completeCheckSessionAction,
  recordCheckEntry as recordCheckEntryAction,
  startCheckSession as startCheckSessionAction,
} from "@/app/actions/checks";
import { queryKeys } from "@/lib/queries/keys";
import type { CheckEntry, CheckResult, CheckSession, CheckType } from "@/lib/types";

/**
 * Check session mutations.
 *
 * `useRecordCheckEntry` is the one that matters. Staff tap present/missing down
 * a department's whole item list, one request per tap, on the building's wifi.
 * The store used to patch local state the instant the action returned; without
 * an optimistic update the same flow would now wait for a round trip per tap
 * and feel materially worse than before the migration.
 *
 * The pattern is the standard cancel → snapshot → patch → rollback-on-error.
 */

function invalidateChecks(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId?: string
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.checks.all() });
  if (sessionId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.checks.detail(sessionId),
    });
  }
  // A completed check moves the dashboard's weekly card and last-checked
  // stamps on the inventory rows.
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
  queryClient.invalidateQueries({ queryKey: queryKeys.items.all() });
  queryClient.invalidateQueries({ queryKey: ["activity"] });
}

export interface RecordEntryInput {
  session_id: string;
  item_id: string;
  result: CheckResult;
  quantity_seen?: number;
  note?: string;
  /** The item's current quantity, for the optimistic row only. */
  quantity_expected?: number;
}

export function useRecordCheckEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordEntryInput) => {
      const res = await recordCheckEntryAction({
        session_id: input.session_id,
        item_id: input.item_id,
        result: input.result,
        quantity_seen: input.quantity_seen,
        note: input.note,
      });
      if ("error" in res) throw new Error(res.error);
      return res.entry;
    },

    onMutate: async (input) => {
      const key = queryKeys.checks.detail(input.session_id);
      // Stop any in-flight refetch from landing on top of the patch below.
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<CheckSession | null>(key);

      const optimistic: CheckEntry = {
        // Replaced by the server row on settle; only needs to be unique here.
        id: `optimistic:${input.item_id}`,
        session_id: input.session_id,
        item_id: input.item_id,
        result: input.result,
        quantity_expected: input.quantity_expected ?? 0,
        quantity_seen: input.quantity_seen ?? 0,
        note: input.note ?? null,
        checked_by: null,
        checked_at: new Date().toISOString(),
      };

      queryClient.setQueryData<CheckSession | null>(key, (old) => {
        if (!old) return old;
        const exists = old.entries.some((e) => e.item_id === input.item_id);
        return {
          ...old,
          entries: exists
            ? old.entries.map((e) =>
                e.item_id === input.item_id ? { ...e, ...optimistic } : e
              )
            : [...old.entries, optimistic],
        };
      });

      return { previous, key };
    },

    onError: (_error, _input, context) => {
      // Put the pre-tap state back so the row does not lie about being recorded.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.checks.detail(input.session_id),
      });
    },
  });
}

export function useStartCheckSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      department_id: string;
      session_type: CheckType;
    }) => {
      const res = await startCheckSessionAction(input);
      if ("error" in res) throw new Error(res.error);
      return res.session;
    },
    onSuccess: (session) => invalidateChecks(queryClient, session.id),
  });
}

export function useBulkMarkRemainingPresent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await bulkMarkRemainingPresentAction(sessionId);
      if ("error" in res) throw new Error(res.error);
      return res.entries;
    },
    onSuccess: (_entries, sessionId) =>
      invalidateChecks(queryClient, sessionId),
  });
}

export function useCompleteCheckSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await completeCheckSessionAction(sessionId);
      if ("error" in res) throw new Error(res.error);
      return res.session;
    },
    onSuccess: (_session, sessionId) => invalidateChecks(queryClient, sessionId),
  });
}

export function useAbandonCheckSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await abandonCheckSessionAction(sessionId);
      if ("error" in res) throw new Error(res.error);
      return res.session;
    },
    onSuccess: (_session, sessionId) => invalidateChecks(queryClient, sessionId),
  });
}
