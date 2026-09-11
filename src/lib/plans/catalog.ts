import "server-only";
import { cache } from "react";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  DEFAULT_PLANS,
  PLAN_FEATURE_IDS,
  PLAN_ICON_KEYS,
  resolvePlan,
} from "@/constants/plans";
import type {
  LocalizedText,
  PlanDefinition,
  PlanFeature,
  PlanIconKey,
  PlanOfferConfig,
} from "@/types/plan";

export const PLANS_COLLECTION = "plans";
export const PRICING_SETTINGS_DOC = "platform_settings/pricing";

function toMillis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    const fn = (value as { toMillis?: unknown }).toMillis;
    if (typeof fn === "function") return fn.call(value) as number;
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function localized(value: unknown, fallback: LocalizedText): LocalizedText {
  if (!value || typeof value !== "object") return fallback;
  const data = value as Record<string, unknown>;
  return { ar: str(data.ar), en: str(data.en) };
}

function limit(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value < 0
      ? -1
      : Math.floor(value)
    : fallback;
}

function parseOffer(raw: unknown): PlanOfferConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const price = data.priceSar;
  return {
    enabled: data.enabled === true,
    type: data.type === "text" ? "text" : "discount",
    priceSar: typeof price === "number" && price > 0 ? price : null,
    labelAr: str(data.labelAr),
    labelEn: str(data.labelEn),
    endsAtMs: toMillis(data.endsAt),
  };
}

const EMPTY_PLAN: Omit<PlanDefinition, "id"> = {
  order: 99,
  name: { ar: "", en: "" },
  tagline: { ar: "", en: "" },
  priceSar: 0,
  maxListings: 0,
  maxEmployees: 0,
  features: [],
  highlightsIntro: { ar: "", en: "" },
  highlights: [],
  icon: "sprout",
  badge: { ar: "", en: "" },
  offer: null,
};

/**
 * Parse a stored plan doc. Docs for the built-in ids are merged over the
 * defaults, so partial docs (e.g. only a price/offer) keep working.
 */
export function parsePlanDoc(
  id: string,
  data: Record<string, unknown>,
): PlanDefinition {
  const base = DEFAULT_PLANS.find((plan) => plan.id === id) ?? {
    id,
    ...EMPTY_PLAN,
    name: { ar: id, en: id },
  };
  const features = Array.isArray(data.features)
    ? data.features.filter((f): f is PlanFeature =>
        (PLAN_FEATURE_IDS as readonly string[]).includes(f as string),
      )
    : base.features;
  const highlights = Array.isArray(data.highlights)
    ? data.highlights
        .map((h) => localized(h, { ar: "", en: "" }))
        .filter((h) => h.ar.trim() || h.en.trim())
    : base.highlights;
  const icon = (PLAN_ICON_KEYS as readonly string[]).includes(str(data.icon))
    ? (data.icon as PlanIconKey)
    : base.icon;
  const price = data.priceSar;

  return {
    id,
    order:
      typeof data.order === "number" && Number.isFinite(data.order)
        ? data.order
        : base.order,
    name: localized(data.name, base.name),
    tagline: localized(data.tagline, base.tagline),
    priceSar: typeof price === "number" && price > 0 ? price : base.priceSar,
    maxListings: limit(data.maxListings, base.maxListings),
    maxEmployees: limit(data.maxEmployees, base.maxEmployees),
    features,
    highlightsIntro: localized(data.highlightsIntro, base.highlightsIntro),
    highlights,
    icon,
    badge: localized(data.badge, base.badge),
    offer: "offer" in data ? parseOffer(data.offer) : base.offer,
  };
}

/** Firestore shape for a plan (id is the doc id). */
export function planToDoc(plan: PlanDefinition): Record<string, unknown> {
  const { id: _id, offer, ...rest } = plan;
  return {
    ...rest,
    offer: offer
      ? {
          enabled: offer.enabled,
          type: offer.type,
          priceSar: offer.priceSar,
          labelAr: offer.labelAr,
          labelEn: offer.labelEn,
          endsAt:
            offer.endsAtMs === null ? null : Timestamp.fromMillis(offer.endsAtMs),
        }
      : null,
  };
}

const byOrder = (a: PlanDefinition, b: PlanDefinition) =>
  a.order - b.order || a.id.localeCompare(b.id);

/**
 * Every plan, lowest first. Until an admin saves plans, the built-in lineup
 * is used. One read per request.
 */
export const getPlans = cache(async (): Promise<PlanDefinition[]> => {
  const snap = await adminDb().collection(PLANS_COLLECTION).get();
  if (snap.empty) return [...DEFAULT_PLANS].sort(byOrder);
  return snap.docs
    .map((doc) => parsePlanDoc(doc.id, doc.data() as Record<string, unknown>))
    .sort(byOrder);
});

/** A company's plan by stored id (unknown ids fall back to the lowest plan). */
export async function getPlan(value: unknown): Promise<PlanDefinition> {
  return resolvePlan(await getPlans(), value);
}

/**
 * Before the first admin write, persist the built-in lineup so that saving,
 * adding or deleting one plan never makes the others disappear.
 */
export async function ensurePlansSeeded(db: Firestore = adminDb()) {
  const existing = await db.collection(PLANS_COLLECTION).limit(1).get();
  if (!existing.empty) return;
  const batch = db.batch();
  for (const plan of DEFAULT_PLANS) {
    batch.set(db.doc(`${PLANS_COLLECTION}/${plan.id}`), planToDoc(plan));
  }
  await batch.commit();
}

/** Whether visitors can see `/pricing`. Hidden until an admin turns it on. */
export const getPricingVisible = cache(async (): Promise<boolean> => {
  const snap = await adminDb().doc(PRICING_SETTINGS_DOC).get();
  return snap.exists && snap.get("visible") === true;
});
