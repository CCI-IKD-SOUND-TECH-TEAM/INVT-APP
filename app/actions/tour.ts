"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/** Same non-discriminated shape as AuthResult — see the note in auth.ts. */
export type TourResult = { ok: boolean; error?: string };

/**
 * Stamps the onboarding tour as done. Finishing and skipping both count —
 * the tour never nags twice.
 *
 * The `.is(null)` filter makes this idempotent for replays: finishing a
 * replayed tour (Settings → Replay tour) keeps the original timestamp.
 * The client sets a localStorage guard before calling this, so a failure
 * here degrades to per-device persistence rather than a re-shown tour.
 */
export async function completeTour(): Promise<TourResult> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ tour_completed_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("tour_completed_at", null);

  if (error) {
    console.error("[tour] completeTour failed", error);
    return { ok: false, error: "Couldn't save tour status." };
  }
  return { ok: true };
}
