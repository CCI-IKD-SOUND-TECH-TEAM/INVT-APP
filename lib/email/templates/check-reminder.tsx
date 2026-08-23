import { Section } from "@react-email/components";
import EmailLayout, {
  ActionButton,
  DetailRow,
  Heading,
  Paragraph,
} from "./_layout";

export interface PendingCheck {
  departmentName: string;
  /** "Setup" | "Set-down" (lib/checks.ts CHECK_TYPE_LABEL). */
  checkLabel: string;
  status: "not started" | "in progress";
}

export interface CheckReminderEmailProps {
  /**
   * "service-day" goes out Sunday morning as the week's cue; "overdue" is the
   * midweek nudge when checks from Sunday still aren't done.
   */
  variant: "service-day" | "overdue";
  pending: PendingCheck[];
  /** ISO date of the week's Sunday. */
  weekStart: string;
  /** Absolute URL to the checks page. */
  url: string;
}

/**
 * Sent by the check-reminder cron (app/api/cron/check-reminder). The habit
 * cue lives outside the app — an app nobody opens can't remind anyone.
 */
export default function CheckReminderEmail({
  variant,
  pending,
  weekStart,
  url,
}: CheckReminderEmailProps) {
  const serviceDay = variant === "service-day";
  return (
    <EmailLayout
      preview={
        serviceDay
          ? `${pending.length} check${pending.length === 1 ? "" : "s"} to do today`
          : `${pending.length} weekly check${pending.length === 1 ? "" : "s"} still not done`
      }
    >
      <Heading>
        {serviceDay ? "It's service day" : "This week's checks aren't done"}
      </Heading>
      <Paragraph muted>
        {serviceDay
          ? "The setup check confirms everything is where it should be before service starts, and the set-down check closes the day out. Each one takes a few minutes."
          : `Service was Sunday (week of ${weekStart}) and these checks still haven't been completed. A quick walkthrough keeps the record matching reality.`}
      </Paragraph>

      <Section style={{ marginBottom: "8px" }}>
        {pending.map((p) => (
          <DetailRow
            key={`${p.departmentName}:${p.checkLabel}`}
            label={p.departmentName}
            value={`${p.checkLabel} — ${p.status}`}
          />
        ))}
      </Section>

      <ActionButton href={url} label="Open weekly checks" />
    </EmailLayout>
  );
}

CheckReminderEmail.PreviewProps = {
  variant: "service-day",
  pending: [
    { departmentName: "Sound", checkLabel: "Setup", status: "not started" },
    { departmentName: "Sound", checkLabel: "Set-down", status: "not started" },
    { departmentName: "Light", checkLabel: "Setup", status: "in progress" },
  ],
  weekStart: "2026-08-23",
  url: "https://example.com/checks",
} satisfies CheckReminderEmailProps;
