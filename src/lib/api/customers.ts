import {
  normalizeContactMethod,
  normalizeEmail,
} from "@/lib/api/lead-requests";
import { normalizeText } from "@/lib/api/company-leads";

/**
 * Validation for the customer self-signup payload. Reuses the same text/email/
 * contact-method normalisers as the public lead-request flow so customer data
 * is sanitised identically wherever it enters the system.
 */

export interface NormalizedCustomerSignup {
  name: string;
  email: string;
  phone: string;
  password: string;
  preferredContactMethod: string | null;
  contactConsent: boolean;
}

export function validateCustomerSignup(
  body: Record<string, unknown>,
):
  | { ok: true; value: NormalizedCustomerSignup }
  | { ok: false; error: string } {
  const name = normalizeText(body.name);
  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: "الاسم يجب أن يكون بين 2 و120 حرفًا." };
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return { ok: false, error: "البريد الإلكتروني غير صالح." };
  }

  const phone = normalizeText(body.phone);
  if (phone.length < 4 || phone.length > 40) {
    return { ok: false, error: "رقم الجوال غير صالح." };
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 256) {
    return { ok: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      phone,
      password,
      preferredContactMethod: normalizeContactMethod(
        body.preferredContactMethod,
      ),
      contactConsent: body.contactConsent === true,
    },
  };
}
