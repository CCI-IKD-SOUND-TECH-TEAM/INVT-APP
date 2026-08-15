"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/site-url";
import DefectLoggedEmail from "@/lib/email/templates/defect-logged";
import DefectResolvedEmail, {
  type DefectOutcome,
} from "@/lib/email/templates/defect-resolved";
import CheckCompletedEmail from "@/lib/email/templates/check-completed";
import { CHECK_TYPE_LABEL } from "@/lib/checks";
import type { CheckType, DefectSeverity } from "@/lib/types";

/**
 * Defect notifications.
 *
 * FIRE-AND-FORGET, deliberately. Every function here swallows its errors: a
 * defect must still get logged when email is down or misconfigured. Callers in
 * Callers invoke these without awaiting the result, so a slow mail send
 * never blocks the UI either.
 */

/** Everyone active except the person who performed the action. */
async function recipients(excludeUserId: string): Promise<string[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("is_active", true);

  if (error) {
    console.error("[notify] recipient lookup failed", error);
    return [];
  }

  return (data ?? [])
    .filter((p) => p.id !== excludeUserId)
    .map((p) => p.email)
    .filter(Boolean);
}

export async function notifyDefectLogged(input: {
  actorId: string;
  actorName: string;
  itemName: string;
  severity: DefectSeverity;
  description: string;
  dateReported: string;
}): Promise<void> {
  try {
    const to = await recipients(input.actorId);
    if (to.length === 0) return;

    await sendEmail({
      to,
      subject: `${input.severity} severity defect — ${input.itemName}`,
      react: DefectLoggedEmail({
        itemName: input.itemName,
        severity: input.severity,
        description: input.description,
        reportedBy: input.actorName,
        dateReported: input.dateReported,
        url: `${siteUrl()}/defects`,
      }),
    });
  } catch (err) {
    console.error("[notify] defect-logged failed", err);
  }
}

export async function notifyCheckCompleted(input: {
  actorId: string;
  actorName: string;
  departmentName: string;
  sessionType: CheckType;
  weekStart: string;
  missing: string[];
  shortfalls: { name: string; seen: number; expected: number }[];
  issues: string[];
}): Promise<void> {
  try {
    const to = await recipients(input.actorId);
    if (to.length === 0) return;

    const label = CHECK_TYPE_LABEL[input.sessionType];
    await sendEmail({
      to,
      subject: `Missing items — ${input.departmentName} ${label.toLowerCase()} check`,
      react: CheckCompletedEmail({
        departmentName: input.departmentName,
        sessionLabel: label,
        weekStart: input.weekStart,
        completedBy: input.actorName,
        missing: input.missing,
        shortfalls: input.shortfalls,
        issues: input.issues,
        url: `${siteUrl()}/checks`,
      }),
    });
  } catch (err) {
    console.error("[notify] check-completed failed", err);
  }
}

export async function notifyDefectClosed(input: {
  actorId: string;
  actorName: string;
  itemName: string;
  outcome: DefectOutcome;
  resolutionNotes: string;
  itemStatus: string;
}): Promise<void> {
  try {
    const to = await recipients(input.actorId);
    if (to.length === 0) return;

    await sendEmail({
      to,
      subject: `${input.itemName} — defect ${input.outcome.toLowerCase()}`,
      react: DefectResolvedEmail({
        itemName: input.itemName,
        outcome: input.outcome,
        resolutionNotes: input.resolutionNotes,
        resolvedBy: input.actorName,
        itemStatus: input.itemStatus,
        url: `${siteUrl()}/defects`,
      }),
    });
  } catch (err) {
    console.error("[notify] defect-closed failed", err);
  }
}
