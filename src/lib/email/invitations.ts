import "server-only";
import nodemailer from "nodemailer";

interface InvitationEmailInput {
  to: string;
  inviteeName?: string | null;
  companyName: string;
  roleLabel: string;
  invitedByEmail?: string | null;
  suggestedLoginUrl: string;
  acceptApiUrl: string;
  passwordResetLink?: string | null;
  expiresAtIso?: string | null;
}

export interface InvitationEmailResult {
  sent: boolean;
  skipped: boolean;
  reason?: string;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT ?? "465");

  if (!host || !user || !pass || !Number.isFinite(port)) {
    return null;
  }

  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return {
    transporter,
    from: process.env.EMAIL_FROM?.trim() || "noreply@listingproperty.app",
    appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Dar",
  };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function displayDate(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toUTCString();
}

export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<InvitationEmailResult> {
  const transport = createTransport();
  if (!transport) {
    return {
      sent: false,
      skipped: true,
      reason: "SMTP_NOT_CONFIGURED",
    };
  }

  const inviteeName = input.inviteeName?.trim() || "there";
  const expiresText = displayDate(input.expiresAtIso);

  const subject = `Invitation to join ${input.companyName} on ${transport.appName}`;

  const lines = [
    `Hello ${inviteeName},`,
    "",
    `You have been invited to join ${input.companyName} as ${input.roleLabel}.`,
    "",
    input.passwordResetLink
      ? `Set your password: ${input.passwordResetLink}`
      : "",
    `Sign in: ${input.suggestedLoginUrl}`,
    `Invitation accept endpoint: ${input.acceptApiUrl}`,
    expiresText ? `Invitation expires: ${expiresText}` : "",
    "",
    "If you did not expect this invitation, please ignore this email.",
  ].filter(Boolean);

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:8px;">You are invited to join Dar</h2>
      <p>Hello ${escapeHtml(inviteeName)},</p>
      <p>
        You have been invited to join <strong>${escapeHtml(input.companyName)}</strong>
        as <strong>${escapeHtml(input.roleLabel)}</strong>.
      </p>
      ${input.passwordResetLink ? `<p><a href="${escapeHtml(input.passwordResetLink)}">Set your password</a></p>` : ""}
      <p><a href="${escapeHtml(input.suggestedLoginUrl)}">Sign in with invitation link</a></p>
      <p style="font-size:12px;color:#666;word-break:break-all;">Direct accept URL: ${escapeHtml(input.acceptApiUrl)}</p>
      ${expiresText ? `<p style="font-size:12px;color:#666;">Expires: ${escapeHtml(expiresText)}</p>` : ""}
      <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;" />
      <p style="font-size:12px;color:#666;">If you did not expect this invitation, please ignore this email.</p>
    </div>
  `;

  try {
    await transport.transporter.sendMail({
      from: transport.from,
      to: input.to,
      subject,
      text: lines.join("\n"),
      html,
    });

    return {
      sent: true,
      skipped: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "EMAIL_SEND_FAILED";
    return {
      sent: false,
      skipped: false,
      reason: message,
    };
  }
}
