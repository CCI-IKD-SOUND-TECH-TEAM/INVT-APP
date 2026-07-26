import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { color, font } from "../theme";

/**
 * Shared shell for every email. Carries the constraints the medium imposes on
 * the DESIGN.md system:
 *
 * - `color-scheme: dark` tells Gmail/Apple Mail this design is already dark, so
 *   they skip the automatic inversion that would otherwise mangle the
 *   #000000 -> #121214 -> #1a1a1d surface ladder into muddy grey.
 * - @react-email/components render Section/Row/Column as <table>, which is what
 *   Outlook on Windows (Word rendering engine) needs — it has no flexbox and
 *   unreliable div background support.
 * - Every colour is an inline literal; no CSS variables survive here.
 * - Per DESIGN.md's No-Shadow Rule, depth is surface steps + 1px borders only,
 *   which happens to be the one part of the system email renders faithfully.
 *
 * The brand lockup is deliberately text + a coloured block rather than
 * logo.jpg: most clients block remote images by default, and a header that
 * disappears is worse than one that renders in Arial Narrow.
 */
export default function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: color.bg,
          color: color.ink,
          fontFamily: font.body,
          fontSize: "15px",
          lineHeight: 1.6,
          margin: 0,
          padding: "32px 16px",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          {/* Brand lockup */}
          <Section style={{ paddingBottom: "24px" }}>
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
            >
              <tbody>
                <tr>
                  <td style={{ paddingRight: "10px", verticalAlign: "middle" }}>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "999px",
                        backgroundColor: color.brand,
                      }}
                    />
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <Text
                      style={{
                        margin: 0,
                        fontFamily: font.display,
                        fontSize: "17px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: color.ink,
                      }}
                    >
                      Ikorodu Inventory
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Card */}
          <Section
            style={{
              backgroundColor: color.surface,
              border: `1px solid ${color.line}`,
              borderRadius: "14px",
              padding: "32px",
            }}
          >
            {children}
          </Section>

          <Hr
            style={{
              border: "none",
              borderTop: `1px solid ${color.lineSubtle}`,
              margin: "24px 0 16px",
            }}
          />
          <Text
            style={{
              margin: 0,
              color: color.inkFaint,
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            CCI Ikorodu — church asset inventory, defect, and repair tracking.
            This is an automated message; replies aren&apos;t monitored.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Section heading in the display face. */
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 12px",
        fontFamily: font.display,
        fontSize: "26px",
        lineHeight: 1.1,
        letterSpacing: "0.01em",
        color: color.ink,
      }}
    >
      {children}
    </Text>
  );
}

/** Body copy. */
export function Paragraph({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        color: muted ? color.inkMuted : color.ink,
        fontSize: "15px",
        lineHeight: 1.6,
      }}
    >
      {children}
    </Text>
  );
}

/**
 * Label/value row for detail blocks. The label uses DESIGN.md's Label style
 * (uppercase, tracked, muted) so these read like the app's table headers.
 */
export function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width="100%"
      style={{ marginBottom: "12px" }}
    >
      <tbody>
        <tr>
          <td>
            <Text
              style={{
                margin: "0 0 2px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: color.inkFaint,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: "15px",
                lineHeight: 1.5,
                color: valueColor ?? color.ink,
              }}
            >
              {value}
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Primary CTA. Rendered as a table cell rather than @react-email's <Button>
 * so Outlook gets a reliable background fill.
 */
export function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: color.brand,
              borderRadius: "10px",
            }}
          >
            <a
              href={href}
              style={{
                display: "inline-block",
                padding: "12px 20px",
                fontFamily: font.body,
                fontSize: "15px",
                fontWeight: 700,
                color: color.white,
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
