import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/site-url";
import { CHECK_TYPE_LABEL, weekStartIso } from "@/lib/checks";
import type { CheckType } from "@/lib/types";
import CheckReminderEmail, {
  type PendingCheck,
} from "@/lib/email/templates/check-reminder";

/**
 * Weekly-check reminders — the habit cue that reaches the team outside the
 * app. Scheduled daily from vercel.json (05:00 UTC = 06:00 Lagos) and only
 * acts on two days:
 *
 *   Sunday    — service day, the first day of the check week: "checks to do
 *               today", sent whenever any department × type slot isn't
 *               completed yet (at 6am that's normally all of them).
 *   Wednesday — the overdue nudge: service was three days ago and some checks
 *               still aren't done.
 *
 * Every other day exits without querying. Runs with the service-role client:
 * cron has no user session, so there is no RLS context to read under.
 */

const CHECK_TYPES: CheckType[] = ["setup", "set_down"];

/** See app/api/cron/low-stock: raw Postgres vs PostgREST missing-table codes. */
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/check-reminder] CRON_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 05:00 UTC is 06:00 in Lagos on the same calendar day, so the UTC weekday
  // is the Lagos weekday at every hour this cron can fire.
  const day = new Date().getUTCDay();
  const variant =
    day === 0 ? ("service-day" as const) : day === 3 ? ("overdue" as const) : null;
  if (!variant) {
    return NextResponse.json({ sent: false, reason: "not a reminder day" });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[cron/check-reminder]", err);
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const { data: departments, error: deptError } = await admin
    .from("departments")
    .select("id, name")
    .order("name");

  if (deptError) {
    if (deptError.code && MISSING_TABLE_CODES.has(deptError.code)) {
      return NextResponse.json({ skipped: "departments table does not exist yet" });
    }
    console.error("[cron/check-reminder] departments query failed", deptError);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }

  // Same checkable predicate as startCheckSession: non-retired items only. A
  // department with nothing to check gets no reminder rows.
  const { data: items, error: itemsError } = await admin
    .from("inventory_items")
    .select("department_id")
    .neq("status", "Retired");

  if (itemsError) {
    console.error("[cron/check-reminder] items query failed", itemsError);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }

  const checkableDeptIds = new Set((items ?? []).map((i) => i.department_id));

  const week = weekStartIso();
  const { data: sessions, error: sessionsError } = await admin
    .from("check_sessions")
    .select("department_id, session_type, status")
    .eq("week_start", week)
    .neq("status", "abandoned");

  if (sessionsError) {
    console.error("[cron/check-reminder] sessions query failed", sessionsError);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }

  const pending: PendingCheck[] = [];
  for (const dept of departments ?? []) {
    if (!checkableDeptIds.has(dept.id)) continue;
    for (const type of CHECK_TYPES) {
      const session = (sessions ?? []).find(
        (s) => s.department_id === dept.id && s.session_type === type
      );
      if (session?.status === "completed") continue;
      pending.push({
        departmentName: dept.name,
        checkLabel: CHECK_TYPE_LABEL[type],
        status: session ? "in progress" : "not started",
      });
    }
  }

  if (pending.length === 0) {
    return NextResponse.json({ sent: false, reason: "all checks done" });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("email")
    .eq("is_active", true);

  const to = (profiles ?? []).map((p) => p.email).filter(Boolean);
  if (to.length === 0) {
    return NextResponse.json({ sent: false, reason: "no active recipients" });
  }

  const n = pending.length;
  const result = await sendEmail({
    to,
    subject:
      variant === "service-day"
        ? `Service day — ${n} check${n === 1 ? "" : "s"} to do`
        : `${n} weekly check${n === 1 ? "" : "s"} still not done`,
    react: CheckReminderEmail({
      variant,
      pending,
      weekStart: week,
      url: `${siteUrl()}/checks`,
    }),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ sent: true, variant, count: n });
}
