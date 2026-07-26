import "server-only";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

/**
 * Brevo transactional-email wrapper shared by both send paths (auth hook +
 * product emails).
 *
 * Failure policy differs by caller, so this returns a result rather than
 * throwing:
 *  - the auth hook MUST surface failures (a sign-in email that silently
 *    vanishes leaves the user staring at an OTP screen forever), so it checks
 *    `ok` and returns 500 to Supabase
 *  - product emails are fire-and-forget — see notifyDefectLogged in
 *    app/actions/notifications.ts
 *
 * Kept behind the same `sendEmail` / `SendResult` interface the callers used
 * with Resend, so switching providers touched only this file.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Single shape, not a discriminated union — see the note on AuthResult in
 * app/actions/auth.ts. `strict: false` in tsconfig prevents narrowing.
 */
export type SendResult = { ok: boolean; id?: string | null; error?: string };

/**
 * Sender identity, parsed from EMAIL_FROM ("Name <email>") into Brevo's
 * {name, email} shape.
 *
 * Brevo requires a VERIFIED sender — either a single address confirmed via a
 * 6-digit code, or a domain with DKIM/DMARC. There is no sandbox fallback the
 * way Resend had onboarding@resend.dev, so an unset or unverified sender is a
 * hard failure, not a degraded default.
 *
 * Deliverability note: a verified *free-provider* address (@gmail.com) still
 * fails SPF/DKIM alignment receiver-side under the 2024 bulk-sender rules and
 * will spam-filter. Production needs a verified DOMAIN sending from
 * @ccikorodu.org.
 */
export function fromAddress(): { name: string; email: string } {
  const raw = (process.env.EMAIL_FROM ?? "").trim();
  const match = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim() || "CCI Ikorodu Inventory", email: match[2].trim() };
  }
  return { name: "CCI Ikorodu Inventory", email: raw };
}

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string | string[];
  subject: string;
  react: ReactElement;
}): Promise<SendResult> {
  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) return { ok: true, id: null };

  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.error("[email] BREVO_API_KEY is not set");
    return { ok: false, error: "BREVO_API_KEY is not set" };
  }

  const sender = fromAddress();
  if (!sender.email) {
    console.error("[email] EMAIL_FROM has no address");
    return { ok: false, error: "EMAIL_FROM is not set" };
  }

  // Brevo wants an HTML string; the Resend SDK used to render the React element
  // for us, so we render it here instead.
  const htmlContent = await render(react);

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": key,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        // All recipients share one `to` (visible to each other) — matches the
        // prior Resend behaviour, and fine for five trusted internal staff.
        to: recipients.map((email) => ({ email })),
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[email] send failed", {
        subject,
        status: res.status,
        detail,
      });
      return { ok: false, error: `Brevo ${res.status}: ${detail}` };
    }

    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { ok: true, id: data.messageId ?? null };
  } catch (err) {
    // Covers network failures and a malformed endpoint alike.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] send threw", { subject, message });
    return { ok: false, error: message };
  }
}
