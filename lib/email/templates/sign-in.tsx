import { Section, Text } from "@react-email/components";
import EmailLayout, { ActionButton, Heading, Paragraph } from "./_layout";
import { color, font } from "../theme";

export interface SignInEmailProps {
  /** 6-digit OTP from the auth hook payload (`email_data.token`). */
  code: string;
  /** Magic link built from `token_hash` — same credential, one tap. */
  url: string;
  /** Minutes until expiry. Must match auth.email.otp_expiry in supabase/config.toml. */
  expiryMinutes?: number;
}

/**
 * Sign-in email. Carries BOTH the code and the link deliberately: the code is
 * for people already sitting in the tab that requested it, the link is for
 * phones where retyping six digits is the friction.
 */
export default function SignInEmail({
  code,
  url,
  expiryMinutes = 10,
}: SignInEmailProps) {
  return (
    <EmailLayout preview={`Your sign-in code is ${code}`}>
      <Heading>Sign in to Inventory</Heading>
      <Paragraph muted>
        Enter this code in the tab you started from:
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
            // Indent by the tracking so the digits stay optically centred —
            // letter-spacing adds trailing space after the last character.
            textIndent: "0.22em",
            color: color.ink,
          }}
        >
          {code}
        </Text>
      </Section>

      <Paragraph muted>Or sign in with one tap:</Paragraph>
      <Section style={{ marginBottom: "20px" }}>
        <ActionButton href={url} label="Sign in to Inventory" />
      </Section>

      <Text
        style={{
          margin: 0,
          color: color.inkFaint,
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        This code expires in {expiryMinutes} minutes and can only be used once.
        If you didn&apos;t request it, you can ignore this email — nobody can
        sign in without it.
      </Text>
    </EmailLayout>
  );
}

SignInEmail.PreviewProps = {
  code: "418209",
  url: "https://example.com/auth/confirm?token_hash=preview&type=email",
  expiryMinutes: 10,
} satisfies SignInEmailProps;
