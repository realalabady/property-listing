import "server-only";
import { PLAN_FEATURE_IDS, PLAN_ICON_KEYS } from "@/constants/plans";
import type {
  LocalizedText,
  PlanDefinition,
  PlanFeature,
  PlanIconKey,
  PlanOfferConfig,
} from "@/types/plan";

const MAX_PRICE_SAR = 1_000_000;
const MAX_LIMIT = 1_000_000;
const MAX_HIGHLIGHTS = 12;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false, error }) as const;

function clean(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function cleanText(value: unknown, max: number): LocalizedText {
  const data =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return { ar: clean(data.ar, max), en: clean(data.en, max) };
}

function parsePrice(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_PRICE_SAR) return null;
  return Math.round(n);
}

/** -1 = unlimited, otherwise an integer between `min` and MAX_LIMIT. */
function parseLimit(value: unknown, min: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (n === -1) return -1;
  if (!Number.isInteger(n) || n < min || n > MAX_LIMIT) return null;
  return n;
}

/** `YYYY-MM-DD` → end of that day in Riyadh (UTC+3), as epoch ms. */
function parseEndDate(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "invalid";
  }
  const ms = new Date(`${value}T23:59:59+03:00`).getTime();
  return Number.isFinite(ms) ? ms : "invalid";
}

function parseOffer(
  raw: unknown,
  priceSar: number,
): Result<PlanOfferConfig | null> {
  if (!raw || typeof raw !== "object") return { ok: true, value: null };
  const data = raw as Record<string, unknown>;
  const enabled = data.enabled === true;
  const type = data.type === "text" ? "text" : "discount";
  const labelAr = clean(data.labelAr, 80);
  const labelEn = clean(data.labelEn, 80);
  const offerPrice = type === "discount" ? parsePrice(data.priceSar) : null;
  const endsAtMs = parseEndDate(data.endsAt);

  if (endsAtMs === "invalid") return fail("تاريخ انتهاء العرض غير صالح.");
  if (enabled) {
    if (!labelAr) return fail("اكتب نص العرض بالعربية.");
    if (type === "discount") {
      if (offerPrice === null) return fail("سعر العرض غير صالح.");
      if (offerPrice >= priceSar) {
        return fail("سعر العرض يجب أن يكون أقل من سعر الباقة.");
      }
    }
    if (endsAtMs !== null && endsAtMs <= Date.now()) {
      return fail("تاريخ انتهاء العرض يجب أن يكون في المستقبل.");
    }
  }
  return {
    ok: true,
    value: { enabled, type, priceSar: offerPrice, labelAr, labelEn, endsAtMs },
  };
}

/** Validate an admin-submitted plan. `id` comes from the URL / create flow. */
export function parsePlanInput(
  id: string,
  body: unknown,
): Result<PlanDefinition> {
  const data =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const name = cleanText(data.name, 40);
  if (!name.ar) return fail("اكتب اسم الباقة بالعربية.");

  const priceSar = parsePrice(data.priceSar);
  if (priceSar === null) return fail("سعر الباقة غير صالح.");

  const maxListings = parseLimit(data.maxListings, 0);
  if (maxListings === null) return fail("عدد العقارات غير صالح.");
  // The owner is an employee too, so a plan needs room for at least one.
  const maxEmployees = parseLimit(data.maxEmployees, 1);
  if (maxEmployees === null) return fail("عدد الموظفين غير صالح.");

  const order = Number(data.order);
  if (!Number.isFinite(order) || Math.abs(order) > 1000) {
    return fail("ترتيب الباقة غير صالح.");
  }

  const features = Array.isArray(data.features)
    ? PLAN_FEATURE_IDS.filter((f) => (data.features as unknown[]).includes(f))
    : ([] as PlanFeature[]);

  const highlights = (Array.isArray(data.highlights) ? data.highlights : [])
    .map((h) => cleanText(h, 120))
    .filter((h) => h.ar || h.en);
  if (highlights.length > MAX_HIGHLIGHTS) {
    return fail(`الحد الأقصى ${MAX_HIGHLIGHTS} نقاط مزايا.`);
  }

  const icon = (PLAN_ICON_KEYS as readonly unknown[]).includes(data.icon)
    ? (data.icon as PlanIconKey)
    : "sprout";

  const offer = parseOffer(data.offer, priceSar);
  if (!offer.ok) return offer;

  return {
    ok: true,
    value: {
      id,
      order,
      name,
      tagline: cleanText(data.tagline, 100),
      priceSar,
      maxListings,
      maxEmployees,
      features,
      highlightsIntro: cleanText(data.highlightsIntro, 80),
      highlights,
      icon,
      badge: cleanText(data.badge, 30),
      offer: offer.value,
    },
  };
}
