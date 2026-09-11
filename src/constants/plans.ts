import type {
  ActivePlanOffer,
  PlanDefinition,
  PlanFeature,
  PlanIconKey,
  PublicPlan,
} from "@/types/plan";

export type { PlanFeature } from "@/types/plan";

/** Every gateable feature, in display order. */
export const PLAN_FEATURE_IDS: readonly PlanFeature[] = [
  "auctions",
  "kpi",
  "pipeline",
  "matched_leads",
];

export const PLAN_FEATURE_LABELS: Record<PlanFeature, { ar: string; en: string }> =
  {
    auctions: { ar: "إدارة المزادات", en: "Auctions" },
    kpi: { ar: "مؤشرات الأداء", en: "KPI dashboard" },
    pipeline: { ar: "مسار المبيعات", en: "Sales pipeline" },
    matched_leads: { ar: "العملاء المطابقون", en: "Matched leads" },
  };

export const PLAN_ICON_KEYS: readonly PlanIconKey[] = [
  "sprout",
  "building",
  "landmark",
  "rocket",
  "star",
  "crown",
];

/** Saudi VAT. Every displayed price excludes it. */
export const VAT_RATE = 0.15;

const text = (ar: string, en: string) => ({ ar, en });
const EMPTY = text("", "");

/**
 * The plan lineup used until an admin saves plans to Firestore — and the base
 * that stored docs with these ids are merged over.
 */
export const DEFAULT_PLANS: readonly PlanDefinition[] = [
  {
    id: "starter",
    order: 1,
    name: text("مبتدئ", "Starter"),
    tagline: text("للمكاتب العقارية في بدايتها", "For agencies getting started"),
    priceSar: 2499,
    maxListings: 20,
    maxEmployees: 2,
    features: [],
    highlightsIntro: EMPTY,
    highlights: [
      text("صفحة شركة عامة بهويتك", "Public company page with your brand"),
      text("إدارة العملاء المحتملين", "Lead management"),
      text("استقبال طلبات العقارات", "Incoming property requests"),
      text("إدارة المهام", "Task management"),
      text("مجموعات الصلاحيات للفريق", "Team permission groups"),
    ],
    icon: "sprout",
    badge: EMPTY,
    offer: null,
  },
  {
    id: "pro",
    order: 2,
    name: text("احترافي", "Pro"),
    tagline: text(
      "للمكاتب المتنامية وفرق المبيعات",
      "For growing agencies and sales teams",
    ),
    priceSar: 4999,
    maxListings: 100,
    maxEmployees: 25,
    features: ["auctions", "kpi"],
    highlightsIntro: text(
      "كل مزايا مبتدئ، بالإضافة إلى:",
      "Everything in Starter, plus:",
    ),
    highlights: [
      text("إدارة المزادات على عقارات البيع", "Auctions on for-sale listings"),
      text("مؤشرات الأداء للشركة والموظفين", "Company and employee KPIs"),
    ],
    icon: "building",
    badge: EMPTY,
    offer: null,
  },
  {
    id: "enterprise",
    order: 3,
    name: text("مؤسسات", "Enterprise"),
    tagline: text("كل المزايا بلا حدود", "Every feature, no limits"),
    priceSar: 8999,
    maxListings: -1,
    maxEmployees: -1,
    features: ["auctions", "kpi", "pipeline", "matched_leads"],
    highlightsIntro: text(
      "كل مزايا احترافي، بالإضافة إلى:",
      "Everything in Pro, plus:",
    ),
    highlights: [
      text(
        "مسار المبيعات بلوحة مراحل قابلة للسحب والإفلات",
        "Sales pipeline with a drag-and-drop stage board",
      ),
      text(
        "العملاء المطابقون: عملاء يبحثون عن عقارات تطابق عقاراتك",
        "Matched leads: buyers searching for listings like yours",
      ),
    ],
    icon: "landmark",
    badge: text("كل المزايا", "All features"),
    offer: null,
  },
];

/** Plan ids are URL/doc-safe slugs. */
export const PLAN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,39}$/;

export function normalizePlanId(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * The plan a company is on. Unknown/removed ids — including the retired
 * `free` plan — fall back to the lowest plan.
 */
export function resolvePlan(
  plans: readonly PlanDefinition[],
  value: unknown,
): PlanDefinition {
  const id = normalizePlanId(value);
  return plans.find((plan) => plan.id === id) ?? plans[0] ?? DEFAULT_PLANS[0]!;
}

export function planHasFeature(
  plan: Pick<PlanDefinition, "features">,
  feature: PlanFeature,
): boolean {
  return plan.features.includes(feature);
}

/** The lowest-ordered plan that unlocks `feature`, or null if none does. */
export function lowestPlanWithFeature(
  plans: readonly PlanDefinition[],
  feature: PlanFeature,
): PlanDefinition | null {
  return plans.find((plan) => planHasFeature(plan, feature)) ?? null;
}

/**
 * The offer to show right now, or `null` when it's off, expired, or a
 * discount that doesn't actually undercut the price.
 */
export function activeOffer(
  plan: Pick<PlanDefinition, "priceSar" | "offer">,
  nowMs: number,
): ActivePlanOffer | null {
  const offer = plan.offer;
  if (!offer?.enabled || !offer.labelAr.trim()) return null;
  if (offer.endsAtMs !== null && offer.endsAtMs <= nowMs) return null;
  if (
    offer.type === "discount" &&
    (offer.priceSar === null ||
      offer.priceSar <= 0 ||
      offer.priceSar >= plan.priceSar)
  ) {
    return null;
  }
  return {
    type: offer.type,
    priceSar: offer.type === "discount" ? offer.priceSar : null,
    labelAr: offer.labelAr,
    labelEn: offer.labelEn,
    endsAtMs: offer.endsAtMs,
  };
}

export function toPublicPlan(plan: PlanDefinition, nowMs: number): PublicPlan {
  return { ...plan, offer: activeOffer(plan, nowMs) };
}

/** A limit of -1 means "no cap". */
export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

/** True when a new item would exceed the plan cap. */
export function isAtLimit(count: number, limit: number): boolean {
  return !isUnlimited(limit) && count >= limit;
}
