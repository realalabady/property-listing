import "server-only";
import { createTransport } from "./transport";
import { renderEmail, type RenderEmailInput } from "./layout";

/**
 * The single send path for transactional email.
 *
 * Contract: this NEVER throws. Every caller sits inside a request handler that
 * has already written to Firestore, so a bad mailbox or a dead SMTP host must
 * not fail the request or roll back the account. Callers surface the result
 * (see `invitationEmail*` in the invitation routes) rather than reacting to it.
 */

export interface EmailResult {
  sent: boolean;
  /** True when we chose not to send (no SMTP, no recipient) — not a failure. */
  skipped: boolean;
  reason?: string;
}

export interface DispatchInput extends Omit<RenderEmailInput, "appName"> {
  /** One address, or several for admin fan-out. */
  to: string | string[];
  subject: string;
  /** Set on alert emails so a reply reaches the person who triggered them. */
  replyTo?: string;
}

/**
 * Render `input` through the shared branded shell and send it.
 *
 * `appName` is injected from the transport so the brand name lives in one
 * place (`NEXT_PUBLIC_APP_NAME`) instead of being hardcoded per template.
 */
export async function dispatch(input: DispatchInput): Promise<EmailResult> {
  const transport = createTransport();
  if (!transport) {
    return { sent: false, skipped: true, reason: "SMTP_NOT_CONFIGURED" };
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((address) => address.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { sent: false, skipped: true, reason: "NO_RECIPIENT" };
  }

  const { to: _to, subject, replyTo, ...rest } = input;
  const { html, text } = renderEmail({ ...rest, appName: transport.appName });

  warnIfSandboxSender(transport.from, recipients);

  try {
    await transport.transporter.sendMail({
      from: transport.from,
      to: recipients.join(", "),
      ...(replyTo ? { replyTo } : {}),
      subject,
      text,
      html,
    });
    return { sent: true, skipped: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "EMAIL_SEND_FAILED";
    // Logged here so a delivery failure is visible in server logs even when
    // the caller only forwards the flag to the UI.
    console.error(`[email] send failed (${subject}):`, message);
    return { sent: false, skipped: false, reason: message };
  }
}

/** Pull the bare address out of `Name <addr@host>`. */
function bareAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

let warnedSandbox = false;

/**
 * Resend's shared sandbox sender (`onboarding@resend.dev`) only delivers to
 * the address that owns the Resend account — and it matches that address
 * exactly, so Gmail `+alias` variants are rejected too. Every other recipient
 * is silently dropped at Resend's end, which looks identical to "the app never
 * sent anything".
 *
 * SMTP accepts the message before that check runs, so nodemailer does not
 * throw and we cannot surface it as a send failure. Warn instead, once per
 * process, naming the recipient that will not receive it.
 */
function warnIfSandboxSender(from: string, recipients: string[]): void {
  if (!bareAddress(from).endsWith("@resend.dev")) return;
  if (warnedSandbox) return;
  warnedSandbox = true;

  console.warn(
    [
      "[email] EMAIL_FROM uses Resend's sandbox domain (onboarding@resend.dev).",
      `         Delivery to ${recipients.join(", ")} will be DROPPED by Resend`,
      "         unless it exactly matches your Resend account address",
      "         (+alias variants do not count).",
      "         Fix: verify a domain in Resend, then set",
      "         EMAIL_FROM=راعي <no-reply@yourdomain.com> and restart.",
    ].join("\n"),
  );
}

/**
 * Where admin-facing alerts go. Falls back to the SMTP sender so a
 * notification still lands somewhere the operator can see.
 */
export function adminNotifyRecipients(): string[] {
  const configured = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  if (configured) {
    return configured
      .split(",")
      .map((address) => address.trim())
      .filter(Boolean);
  }

  // EMAIL_FROM may be "Name <addr@host>" — pull out the bare address.
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  const match = from.match(/<([^>]+)>/);
  const bare = (match?.[1] ?? from).trim();
  return bare ? [bare] : [];
}
