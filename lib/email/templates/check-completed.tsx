import { Section, Text } from "@react-email/components";
import EmailLayout, {
  ActionButton,
  DetailRow,
  Heading,
  Paragraph,
} from "./_layout";
import { color } from "../theme";

export interface CheckCompletedEmailProps {
  departmentName: string;
  /** "Setup" | "Set-down" (lib/checks.ts CHECK_TYPE_LABEL). */
  sessionLabel: string;
  /** ISO date of the week's Sunday. */
  weekStart: string;
  completedBy: string;
  missing: string[];
  shortfalls: { name: string; seen: number; expected: number }[];
  issues: string[];
  /** Absolute URL to the checks page. */
  url: string;
}

const LIST_CAP = 20;

/**
 * Sent to every other active staff member when a weekly check completes with
 * missing items or quantity shortfalls. Issues are listed for context when
 * present, but issues alone never trigger this email — logging the defect
 * already notified the team.
 */
function ItemList({
  label,
  tone,
  rows,
}: {
  label: string;
  tone: string;
  rows: string[];
}) {
  if (rows.length === 0) return null;
  const shown = rows.slice(0, LIST_CAP);
  const more = rows.length - shown.length;
  return (
    <Section style={{ marginBottom: "16px" }}>
      <Text
        style={{
          margin: "0 0 4px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: tone,
        }}
      >
        {label} ({rows.length})
      </Text>
      {shown.map((row) => (
        <Text
          key={row}
          style={{ margin: "0 0 2px", fontSize: "15px", color: color.ink }}
        >
          {row}
        </Text>
      ))}
      {more > 0 && (
        <Text style={{ margin: 0, fontSize: "13px", color: color.inkFaint }}>
          +{more} more
        </Text>
      )}
    </Section>
  );
}

export default function CheckCompletedEmail({
  departmentName,
  sessionLabel,
  weekStart,
  completedBy,
  missing,
  shortfalls,
  issues,
  url,
}: CheckCompletedEmailProps) {
  return (
    <EmailLayout
      preview={`${missing.length} missing — ${departmentName} ${sessionLabel.toLowerCase()} check`}
    >
      <Heading>Items unaccounted for</Heading>
      <Paragraph muted>
        {completedBy} completed the <strong>{departmentName}</strong>{" "}
        {sessionLabel.toLowerCase()} check for the week of {weekStart} and some
        items could not be fully accounted for.
      </Paragraph>

      <Section style={{ marginBottom: "8px" }}>
        <DetailRow label="Department" value={departmentName} />
        <DetailRow label="Check" value={sessionLabel} />
        <DetailRow label="Completed by" value={completedBy} />
      </Section>

      <ItemList label="Missing" tone={color.statusCritical} rows={missing} />
      <ItemList
        label="Short count"
        tone={color.statusCaution}
        rows={shortfalls.map((s) => `${s.name} — saw ${s.seen} of ${s.expected}`)}
      />
      <ItemList label="With issues" tone={color.statusCaution} rows={issues} />

      <ActionButton href={url} label="View weekly checks" />
    </EmailLayout>
  );
}

CheckCompletedEmail.PreviewProps = {
  departmentName: "Sound",
  sessionLabel: "Set-down",
  weekStart: "2026-07-26",
  completedBy: "Tolu Adebayo",
  missing: ["Shure SM58 Microphone", "XLR Cable 10m"],
  shortfalls: [{ name: "Mic Stand", seen: 6, expected: 8 }],
  issues: ["DI Box"],
  url: "https://example.com/checks",
} satisfies CheckCompletedEmailProps;
