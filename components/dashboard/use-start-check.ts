"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { useStartCheckSession } from "@/lib/mutations/checks";
import type { CheckSlot } from "@/lib/queries/use-week-check-slots";

/**
 * Start a check and land in it — the cue and the action as one control.
 *
 * Lifted out of WeeklyCheckCard so the header button and the grid cells run
 * the same code. Each caller holds its own instance: a cell's spinner and the
 * header's spinner are different controls and shouldn't share pending state.
 * They stay in agreement anyway because the mutation invalidates the checks
 * queries both of them read.
 */
export interface StartCheck {
  start: (slot: Pick<CheckSlot, "deptId" | "deptName" | "type">) => Promise<void>;
  /** `${deptName}:${type}` while that slot is starting, else null. */
  pendingKey: string | null;
  error: string | null;
}

export function slotKey(slot: Pick<CheckSlot, "deptName" | "type">): string {
  return `${slot.deptName}:${slot.type}`;
}

export function useStartCheck(): StartCheck {
  const router = useRouter();
  const queryClient = useQueryClient();
  const startCheckSession = useStartCheckSession();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(
    slot: Pick<CheckSlot, "deptId" | "deptName" | "type">
  ): Promise<void> {
    setPendingKey(slotKey(slot));
    setError(null);
    try {
      // Race-safe: the action returns the existing session when someone else
      // started this check first, so both taps land in the same walkthrough.
      const session = await startCheckSession.mutateAsync({
        department_id: slot.deptId,
        session_type: slot.type,
      });
      router.push(`/checks/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start that check.");
      // The usual cause is state this view hasn't seen yet (e.g. completed on
      // another device) — refetch so the grid corrects itself.
      queryClient.invalidateQueries({ queryKey: queryKeys.checks.all() });
    }
    setPendingKey(null);
  }

  return { start, pendingKey, error };
}
