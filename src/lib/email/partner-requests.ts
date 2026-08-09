import "server-only";
import { createTransport, escapeHtml } from "./transport";
import type { NormalizedPartnerRequest } from "@/lib/api/partner-requests";

export interface PartnerRequestEmailResult {
  sent: boolean;
  skipped: boolean;
  reason?: string;
}

/**
 * Where new-partner alerts go. Defaults to the SMTP sender when unset so the
 * notification still lands somewhere the operator can see.
 */
function notifyRecipients(): string[] {
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

/**
 * Alerts the platform admin that an agency applied to join, so they can review
 * it in /admin/partner-requests without polling the dashboard.
 */
export async function sendPartnerRequestEmail(
  request: NormalizedPartnerRequest,
): Promise<PartnerRequestEmailResult> {
  const transport = createTransport();
  if (!transport) {
    return { sent: false, skipped: true, reason: "SMTP_NOT_CONFIGURED" };
  }

  const to = notifyRecipients();
  if (to.length === 0) {
    return { sent: false, skipped: true, reason: "NO_NOTIFY_RECIPIENT" };
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
  ).replace(/\/$/, "");
  const reviewUrl = `${appUrl}/admin/partner-requests`;

  const rows: Array<[string, string]> = [
    ["الشركة", request.companyName],
    ["مسؤول التواصل", request.contactName],
    ["السجل التجاري", request.commercialRegistrationNumber],
    ["البريد الإلكتروني", request.email],
    ["الجوال", request.phone],
    ["المدينة", request.city ?? "—"],
    ["نبذة", request.message ?? "—"],
  ];

  const subject = `طلب شراكة جديد: ${request.companyName}`;

  const text = [
    "وصل طلب شراكة جديد من شركة عقارية.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `مراجعة الطلب: ${reviewUrl}`,
  ].join("\n");

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:8px;">طلب شراكة جديد</h2>
      <p>وصل طلب انضمام جديد من شركة عقارية عبر صفحة "انضم كشريك".</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:8px;border:1px solid #e5e5e5;background:#fafafa;font-weight:bold;width:35%;">${escapeHtml(label)}</td>
            <td style="padding:8px;border:1px solid #e5e5e5;">${escapeHtml(value)}</td>
          </tr>`,
          )
          .join("")}
      </table>
      <p><a href="${escapeHtml(reviewUrl)}" style="display:inline-block;padding:10px 18px;background:#0f6d45;color:#fff;border-radius:6px;text-decoration:none;">مراجعة الطلب وإنشاء الشركة</a></p>
    </div>
  `;

  try {
    await transport.transporter.sendMail({
      from: transport.from,
      to: to.join(", "),
      replyTo: request.email,
      subject,
      text,
      html,
    });
    return { sent: true, skipped: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "EMAIL_SEND_FAILED";
    return { sent: false, skipped: false, reason: message };
  }
}
