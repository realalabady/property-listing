import { LISTING_CATEGORIES } from "@/constants/listing-categories";
import { normalizeText } from "@/lib/api/company-leads";

/**
 * Shared validation for customer "property request" payloads — used by both the
 * public create route and the per-company claim route so a request is validated
 * identically wherever it enters the system. Mirrors the requirement allow-lists
 * already proven in the company leads route.
 */

const INTENT_VALUES = new Set(["buy", "rent", "invest", "sell"]);
const FINANCING_VALUES = new Set(["cash", "mortgage"]);
const TIMELINE_VALUES = new Set(["immediate", "1_3_months", "browsing"]);
const CONTACT_METHOD_VALUES = new Set(["phone", "whatsapp", "email"]);
const CATEGORY_VALUES = new Set<string>(Object.values(LISTING_CATEGORIES));

export function normalizeEmail(value: unknown): string | null {
  // Optional field: missing/empty is allowed (""), only a non-empty invalid
  // string returns null (→ validation error).
  if (typeof value !== "string") return "";
  const next = value.trim().toLowerCase();
  if (!next) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) ? next : null;
}

export function normalizeContactMethod(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return CONTACT_METHOD_VALUES.has(value) ? value : null;
}

function toNonNegativeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Validate + clean the requirement block; returns null when nothing usable. */
export function normalizeRequirement(
  value: unknown,
): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (typeof r.intent === "string" && INTENT_VALUES.has(r.intent)) {
    out.intent = r.intent;
  }
  if (
    typeof r.propertyType === "string" &&
    CATEGORY_VALUES.has(r.propertyType)
  ) {
    out.propertyType = r.propertyType;
  }
  const region = normalizeText(r.region);
  if (region) out.region = region;
  const city = normalizeText(r.city);
  if (city) out.city = city;
  const district = normalizeText(r.district);
  if (district) out.district = district;

  const budgetMin = toNonNegativeNumber(r.budgetMin);
  if (budgetMin != null) out.budgetMin = budgetMin;
  const budgetMax = toNonNegativeNumber(r.budgetMax);
  if (budgetMax != null) out.budgetMax = budgetMax;
  const bedrooms = toNonNegativeNumber(r.bedrooms);
  if (bedrooms != null) out.bedrooms = bedrooms;

  if (typeof r.financing === "string" && FINANCING_VALUES.has(r.financing)) {
    out.financing = r.financing;
  }
  if (typeof r.timeline === "string" && TIMELINE_VALUES.has(r.timeline)) {
    out.timeline = r.timeline;
  }

  return Object.keys(out).length > 0 ? out : null;
}

export interface NormalizedLeadRequest {
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  preferredContactMethod: string | null;
  requirement: Record<string, unknown> | null;
}

/**
 * Validate a raw request body into a clean payload, or return an error message.
 */
export function validateLeadRequestBody(
  body: Record<string, unknown>,
): { ok: true; value: NormalizedLeadRequest } | { ok: false; error: string } {
  const name = normalizeText(body.name);
  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: "الاسم يجب أن يكون بين 2 و120 حرفًا." };
  }

  const phone = normalizeText(body.phone);
  if (phone.length < 4 || phone.length > 40) {
    return { ok: false, error: "رقم الجوال غير صالح." };
  }

  const email = normalizeEmail(body.email);
  if (email === null) {
    return { ok: false, error: "البريد الإلكتروني غير صالح." };
  }

  const message = normalizeText(body.message);
  if (message.length > 4000) {
    return { ok: false, error: "الرسالة طويلة جدًا." };
  }

  return {
    ok: true,
    value: {
      name,
      phone,
      email: email || null,
      message: message || null,
      preferredContactMethod: normalizeContactMethod(body.preferredContactMethod),
      requirement: normalizeRequirement(body.requirement),
    },
  };
}
