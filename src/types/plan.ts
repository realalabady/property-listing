import type { SubscriptionPlanId } from "./company";

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

/** Firestore `plans/{planId}` — admin-editable pricing for one plan. */
export interface PlanPricingConfig {
  /** Yearly price in SAR, before VAT and the setup fee. */
  priceSar: number;
  offer: PlanOfferConfig | null;
}

export type PlanCatalog = Record<SubscriptionPlanId, PlanPricingConfig>;

/** An offer that is on and not expired — what the public page renders. */
export type ActivePlanOffer = Omit<PlanOfferConfig, "enabled">;

export interface PlanDisplayPrice {
  priceSar: number;
  offer: ActivePlanOffer | null;
}
