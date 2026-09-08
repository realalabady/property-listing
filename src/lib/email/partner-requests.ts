import "server-only";
import {
  adminNotifyRecipients,
  dispatch,
  type DispatchInput,
  type EmailResult,
} from "./send";
import type { NormalizedPartnerRequest } from "@/lib/api/partner-requests";

/** @deprecated Use `EmailResult` from ./send. Kept for existing importers. */
export type PartnerRequestEmailResult = EmailResult;

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Alerts the platform admin that an agency applied to join, so they can review
 * it in /admin/partner-requests without polling the dashboard.
 */
export function buildPartnerRequestEmail(
  request: NormalizedPartnerRequest,
  to: string[],
): DispatchInput {
  const reviewUrl = `${appUrl()}/admin/partner-requests`;

  return {
    to,
    // So hitting reply reaches the applicant, not the noreply mailbox.
    replyTo: request.email,
    subject: `طلب شراكة جديد: ${request.companyName}`,
    heading: "طلب شراكة جديد",
    preheader: `${request.companyName} قدّمت طلب انضمام عبر صفحة الشراكة.`,
    blocks: [
      {
        kind: "text",
        value: 'وصل طلب انضمام جديد من شركة عقارية عبر صفحة "انضم كشريك".',
      },
      {
        kind: "rows",
        rows: [
          ["الشركة", request.companyName],
          ["مسؤول التواصل", request.contactName],
          ["السجل التجاري", request.commercialRegistrationNumber],
          ["البريد الإلكتروني", request.email],
          ["الجوال", request.phone],
          ["المدينة", request.cityLabel],
          ["كيف عرفنا", request.hearAboutLabel],
          ["نبذة", request.message ?? "—"],
        ],
      },
    ],
    action: { label: "مراجعة الطلب وإنشاء الشركة", url: reviewUrl },
    footNote: "تنبيه تلقائي من المنصة إلى فريق التشغيل.",
  };
}

export async function sendPartnerRequestEmail(
  request: NormalizedPartnerRequest,
): Promise<EmailResult> {
  const to = adminNotifyRecipients();
  if (to.length === 0) {
    return { sent: false, skipped: true, reason: "NO_NOTIFY_RECIPIENT" };
  }
  return dispatch(buildPartnerRequestEmail(request, to));
}

/**
 * Auto-reply to the applicant so the form doesn't feel like a void. Sent
 * best-effort alongside the admin alert; a failure here never affects the
 * stored application.
 */
export function buildPartnerRequestAckEmail(
  request: NormalizedPartnerRequest,
): DispatchInput {
  return {
    to: request.email,
    subject: "استلمنا طلب الشراكة الخاص بك",
    heading: "استلمنا طلبك",
    preheader: "طلب انضمام شركتك وصل إلينا وقيد المراجعة.",
    blocks: [
      { kind: "text", value: `مرحباً ${request.contactName}،` },
      {
        kind: "text",
        value: `شكراً لاهتمامك بالانضمام إلينا. استلمنا طلب انضمام ${request.companyName} وسيقوم فريقنا بمراجعته والتواصل معك على ${request.phone} أو عبر هذا البريد.`,
      },
      {
        kind: "rows",
        rows: [
          ["الشركة", request.companyName],
          ["السجل التجاري", request.commercialRegistrationNumber],
          ["المدينة", request.cityLabel],
        ],
      },
      { kind: "text", value: "الخطوات القادمة:" },
      {
        kind: "list",
        items: [
          "يراجع فريقنا بيانات الشركة والسجل التجاري.",
          "نتواصل معك لتأكيد التفاصيل وتحديد الباقة المناسبة.",
          "نُفعّل حساب الشركة ونرسل لك بيانات دخول مالك الحساب.",
        ],
      },
      {
        kind: "note",
        value:
          "لا حاجة لإرسال الطلب مرة أخرى. إذا كان لديك أي استفسار، يمكنك الرد على هذه الرسالة مباشرة.",
      },
    ],
    footNote:
      "تلقيت هذه الرسالة لأن طلب شراكة قُدّم بهذا البريد الإلكتروني عبر موقعنا.",
  };
}

export async function sendPartnerRequestAckEmail(
  request: NormalizedPartnerRequest,
): Promise<EmailResult> {
  return dispatch(buildPartnerRequestAckEmail(request));
}
