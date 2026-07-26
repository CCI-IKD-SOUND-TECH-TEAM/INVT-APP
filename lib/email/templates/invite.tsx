import { Section, Text } from "@react-email/components";
import EmailLayout, { ActionButton, Heading, Paragraph } from "./_layout";
import { color, font } from "../theme";

export interface InviteEmailProps {
  /** Recipient's full_name from profiles; falls back to a generic greeting. */
  fullName?: string | null;
  code: string;
  url: string;
  expiryMinutes?: number;
}

/**
 * First-time access email, sent by inviteUserByEmail from Settings.
 *
 * Same credential mechanics as sign-in, different framing: the recipient has
 * never seen this system, so it says what the tool is and — importantly for
 * non-technical staff (PRODUCT.md) — that there's no password to create.
 */
export default function InviteEmail({
  fullName,
  code,
  url,
  expiryMinutes = 10,
}: InviteEmailProps) {
  const firstName = fullName?.trim().split(/\s+/)[0];

  return (
    <EmailLayout preview="You've been added to CCI Ikorodu Inventory">
      <Heading>{firstName ? `Welcome, ${firstName}` : "Welcome"}</Heading>
      <Paragraph muted>
        You&apos;ve been given access to the CCI Ikorodu inventory system — where
        the church&apos;s sound, light, and projection equipment is tracked, and
        defects and repairs are logged.
      </Paragraph>
      <Paragraph muted>
        There&apos;s no password to create. Use this code to get in:
      </Paragraph>

      <Section
        style={{
          backgroundColor: color.surfaceSunken,
          border: `1px solid ${color.line}`,
          borderRadius: "10px",
          padding: "20px",
          textAlign: "center" as const,
          marginBottom: "20px",
        }}
      >
        <Text
          style={{
            margin: 0,
            fontFamily: font.display,
            fontSize: "36px",
            lineHeight: 1.1,
            letterSpacing: "0.22em",
            textIndent: "0.22em",
            color: color.ink,
          }}
        >
          {code}
        </Text>
      </Section>

      <Section style={{ marginBottom: "20px" }}>
        <ActionButton href={url} label="Get started" />
      </Section>

      <Text
        style={{
          margin: 0,
          color: color.inkFaint,
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        This code expires in {expiryMinutes} minutes. If it lapses, ask anyone on
        the team to send you a new one from Settings.
      </Text>
    </EmailLayout>
  );
}

InviteEmail.PreviewProps = {
  fullName: "Ngozi Eze",
  code: "739154",
  url: "https://example.com/auth/confirm?token_hash=preview&type=invite",
  expiryMinutes: 10,
} satisfies InviteEmailProps;
