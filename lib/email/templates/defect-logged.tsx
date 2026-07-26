import { Section } from "@react-email/components";
import EmailLayout, {
  ActionButton,
  DetailRow,
  Heading,
  Paragraph,
} from "./_layout";
import { severityColor } from "../theme";
import type { DefectSeverity } from "@/lib/types";

export interface DefectLoggedEmailProps {
  itemName: string;
  severity: DefectSeverity;
  description: string;
  reportedBy: string;
  dateReported: string;
  /** Absolute URL to the defect log. */
  url: string;
}

/**
 * Sent to every other active staff member when a defect is logged.
 *
 * Severity renders as coloured text rather than a pill — DESIGN.md §5 is
 * explicit that "Severity is not a badge", and that rule holds here so the
 * email reads like the app.
 */
export default function DefectLoggedEmail({
  itemName,
  severity,
  description,
  reportedBy,
  dateReported,
  url,
}: DefectLoggedEmailProps) {
  return (
    <EmailLayout preview={`${severity} severity defect logged — ${itemName}`}>
      <Heading>Defect logged</Heading>
      <Paragraph muted>
        {reportedBy} reported a defect on <strong>{itemName}</strong>. The item
        is now marked Defective.
      </Paragraph>

      <Section style={{ marginBottom: "20px" }}>
        <DetailRow label="Item" value={itemName} />
        <DetailRow
          label="Severity"
          value={severity}
          valueColor={severityColor(severity)}
        />
        <DetailRow label="Reported by" value={reportedBy} />
        <DetailRow label="Date reported" value={dateReported} />
        <DetailRow label="Description" value={description} />
      </Section>

      <ActionButton href={url} label="View defect log" />
    </EmailLayout>
  );
}

DefectLoggedEmail.PreviewProps = {
  itemName: "Shure SM58 Microphone",
  severity: "High",
  description:
    "Intermittent cutout when the cable is moved near the XLR connector.",
  reportedBy: "Tolu Adebayo",
  dateReported: "2026-07-23",
  url: "https://example.com/defects",
} satisfies DefectLoggedEmailProps;
