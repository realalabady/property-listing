import "server-only";
import { createTransport, escapeHtml } from "./transport";

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
      <h2 style="margin-bottom:8px;">You are invited to join Raei</h2>
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
