import { Section } from "@react-email/components";
import EmailLayout, {
  ActionButton,
  DetailRow,
  Heading,
  Paragraph,
} from "./_layout";
import { color } from "../theme";

/** Both terminal states of a defect close the loop and notify the team. */
export type DefectOutcome = "Resolved" | "Not Repairable";

export interface DefectResolvedEmailProps {
  itemName: string;
  outcome: DefectOutcome;
  resolutionNotes: string;
  resolvedBy: string;
  /** Item status after the transition — "Available" on resolve, "Retired" on write-off. */
  itemStatus: string;
  url: string;
}

export default function DefectResolvedEmail({
  itemName,
  outcome,
  resolutionNotes,
  resolvedBy,
  itemStatus,
  url,
}: DefectResolvedEmailProps) {
  const resolved = outcome === "Resolved";
  // Resolved is a "good" outcome, Not Repairable is deliberately desaturated —
  // DESIGN.md maps Not Repairable to the neutral vocabulary, not to critical.
  const outcomeColor = resolved ? color.statusGood : color.statusNeutral;

  return (
    <EmailLayout preview={`${itemName} — defect ${outcome.toLowerCase()}`}>
      <Heading>{resolved ? "Defect resolved" : "Defect closed"}</Heading>
      <Paragraph muted>
        {resolvedBy} marked the defect on <strong>{itemName}</strong> as{" "}
        {outcome}. The item is now {itemStatus}.
      </Paragraph>

      <Section style={{ marginBottom: "20px" }}>
        <DetailRow label="Item" value={itemName} />
        <DetailRow label="Outcome" value={outcome} valueColor={outcomeColor} />
        <DetailRow label="Item status" value={itemStatus} />
        <DetailRow label="Closed by" value={resolvedBy} />
        <DetailRow label="Notes" value={resolutionNotes || "—"} />
      </Section>

      <ActionButton href={url} label="View defect log" />
    </EmailLayout>
  );
}

DefectResolvedEmail.PreviewProps = {
  itemName: "Shure SM58 Microphone",
  outcome: "Resolved",
  resolutionNotes: "Replaced the XLR connector; tested across three services.",
  resolvedBy: "Chuka Obi",
  itemStatus: "Available",
  url: "https://example.com/defects",
} satisfies DefectResolvedEmailProps;
