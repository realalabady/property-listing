/**
 * Subscription plans are admin-managed data (`plans/{planId}`), not code.
 * The code only owns which *features* exist, because each one maps to a gate.
 */

/** Features a plan can switch on. Anything not listed is on every plan. */
export type PlanFeature = "auctions" | "kpi" | "pipeline" | "matched_leads";

/** Line icon shown on the pricing card. */
export type PlanIconKey =
  | "sprout"
  | "building"
  | "landmark"
  | "rocket"
  | "star"
  | "crown";

export interface LocalizedText {
  ar: string;
  en: string;
}

/**
 * `discount`: the offer price replaces the yearly price (old one struck out).
 * `text`: price unchanged, only the offer label is shown.
 */
export type PlanOfferType = "discount" | "text";

/** Admin-edited offer as stored on `plans/{planId}.offer`. */
export interface PlanOfferConfig {
  enabled: boolean;
  type: PlanOfferType;
  /** Offer price for `discount` offers; ignored for `text`. */
  priceSar: number | null;
  labelAr: string;
  labelEn: string;
  /** Offer hides itself after this instant; `null` = until turned off. */
  endsAtMs: number | null;
}

/** One plan, as stored in Firestore `plans/{id}` and enforced at runtime. */
export interface PlanDefinition {
  id: string;
  /** Ascending sort key — pickers, the pricing page and "lowest plan" use it. */
  order: number;
  name: LocalizedText;
  tagline: LocalizedText;
  /** Yearly price in SAR, before VAT and the setup fee. */
  priceSar: number;
  /** -1 = unlimited. Enforced on listing/employee creation. */
  maxListings: number;
  maxEmployees: number;
  features: PlanFeature[];
  /** Optional line above the bullets, e.g. "Everything in Pro, plus:". */
  highlightsIntro: LocalizedText;
  highlights: LocalizedText[];
  icon: PlanIconKey;
  /** Non-empty = featured card with this badge (e.g. "All features"). */
  badge: LocalizedText;
  offer: PlanOfferConfig | null;
}

/** An offer that is on and not expired — what the public page renders. */
export type ActivePlanOffer = Omit<PlanOfferConfig, "enabled">;

/** A plan as the public pricing page receives it. */
export interface PublicPlan extends Omit<PlanDefinition, "offer"> {
  offer: ActivePlanOffer | null;
}
