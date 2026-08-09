import { normalizeText } from "@/lib/api/company-leads";
import { normalizeEmail } from "@/lib/api/lead-requests";

/**
 * Shared validation for "become a partner" applications — a real-estate agency
 * asking the platform to open a company account for them. Submitted publicly
 * from /partner, reviewed by the super admin, who then creates the company.
 */

export const PARTNER_REQUEST_STATUSES = [
  "new",
  "contacted",
  "approved",
  "rejected",
] as const;

export type PartnerRequestStatus = (typeof PARTNER_REQUEST_STATUSES)[number];

export function isPartnerRequestStatus(
  value: unknown,
): value is PartnerRequestStatus {
  return (
    typeof value === "string" &&
    (PARTNER_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Saudi unified commercial registration numbers are 10 digits beginning with 7.
 * Arabic-Indic digits are folded to ASCII first so a copy/paste straight from an
 * official document still passes.
 */
export function normalizeCommercialRegistration(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ascii = value.replace(/[٠-٩]/g, (d) =>
    String(d.charCodeAt(0) - 0x0660),
  );
  const digits = ascii.replace(/\D/g, "");
  return /^7\d{9}$/.test(digits) ? digits : null;
}

export interface NormalizedPartnerRequest {
  companyName: string;
  contactName: string;
  commercialRegistrationNumber: string;
  email: string;
  phone: string;
  city: string | null;
  message: string | null;
}

/**
 * Validate a raw body into a clean payload, or return an Arabic error message
 * suitable for direct display in the public form.
 */
export function validatePartnerRequestBody(
  body: Record<string, unknown>,
):
  | { ok: true; value: NormalizedPartnerRequest }
  | { ok: false; error: string } {
  const companyName = normalizeText(body.companyName);
  if (companyName.length < 2 || companyName.length > 160) {
    return { ok: false, error: "اسم الشركة يجب أن يكون بين 2 و160 حرفًا." };
  }

  const contactName = normalizeText(body.contactName);
  if (contactName.length < 2 || contactName.length > 120) {
    return { ok: false, error: "الاسم يجب أن يكون بين 2 و120 حرفًا." };
  }

  const commercialRegistrationNumber = normalizeCommercialRegistration(
    body.commercialRegistrationNumber,
  );
  if (!commercialRegistrationNumber) {
    return {
      ok: false,
      error: "رقم السجل التجاري يجب أن يتكوّن من 10 أرقام ويبدأ بالرقم 7.",
    };
  }

  // Unlike a lead request, the email is how the admin sends account details —
  // so here it is required, not optional.
  const email = normalizeEmail(body.email);
  if (!email) {
    return { ok: false, error: "البريد الإلكتروني غير صالح." };
  }

  // Required: the phone is how the admin actually reaches the applicant.
  const phone = normalizeText(body.phone);
  if (phone.length < 8 || phone.length > 40) {
    return { ok: false, error: "الرجاء إدخال رقم جوال صحيح." };
  }

  const city = normalizeText(body.city);
  if (city.length > 120) {
    return { ok: false, error: "اسم المدينة طويل جدًا." };
  }

  const message = normalizeText(body.message);
  if (message.length > 4000) {
    return { ok: false, error: "الرسالة طويلة جدًا." };
  }

  return {
    ok: true,
    value: {
      companyName,
      contactName,
      commercialRegistrationNumber,
      email,
      phone,
      city: city || null,
      message: message || null,
    },
  };
}
