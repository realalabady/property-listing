import type { SubscriptionPlanId } from "@/types/company";

/** Plans in ascending order — drives pickers, the pricing page, and upgrades. */
export const PLAN_IDS: readonly SubscriptionPlanId[] = [
  "starter",
  "pro",
  "enterprise",
];

/**
 * Per-plan quotas. `-1` means unlimited. These are the real limits enforced
 * server-side on listing/employee creation (see the listings + employees APIs).
 */
export interface PlanLimits {
  maxListings: number;
  maxEmployees: number;
}

export const PLAN_LIMITS: Record<SubscriptionPlanId, PlanLimits> = {
  starter: { maxListings: 20, maxEmployees: 2 },
  pro: { maxListings: 100, maxEmployees: 25 },
  enterprise: { maxListings: -1, maxEmployees: -1 },
};

/** Yearly price per plan in SAR, before VAT and the one-time setup fee. */
export const PLAN_PRICES_SAR: Record<SubscriptionPlanId, number> = {
  starter: 2499,
  pro: 4999,
  enterprise: 8999,
};

/** One-time fee charged when the company account is created (before VAT). */
export const SETUP_FEE_SAR = 1000;

/** Saudi VAT. Every displayed price excludes it. */
export const VAT_RATE = 0.15;

/**
 * Features that only some plans unlock. Anything not listed here is available
 * on every plan.
 */
export type PlanFeature = "pipeline" | "matched_leads";

export const PLAN_FEATURES: Record<SubscriptionPlanId, readonly PlanFeature[]> =
  {
    starter: [],
    pro: [],
    enterprise: ["pipeline", "matched_leads"],
  };

export function isSubscriptionPlanId(
  value: unknown,
): value is SubscriptionPlanId {
  return (
    typeof value === "string" &&
    (PLAN_IDS as readonly string[]).includes(value)
  );
}

/**
 * Normalizes a stored/submitted plan value. Unknown values — including the
 * retired `free` plan — fall back to `starter`.
 */
export function parseSubscriptionPlan(value: unknown): SubscriptionPlanId {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  return isSubscriptionPlanId(normalized) ? normalized : "starter";
}

export function limitsForPlan(plan: SubscriptionPlanId): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
}

export function planHasFeature(
  plan: SubscriptionPlanId,
  feature: PlanFeature,
): boolean {
  return (PLAN_FEATURES[plan] ?? []).includes(feature);
}

/** The cheapest plan that unlocks `feature`. */
export function lowestPlanWithFeature(feature: PlanFeature): SubscriptionPlanId {
  return PLAN_IDS.find((plan) => planHasFeature(plan, feature)) ?? "enterprise";
}

/** A limit of -1 means "no cap". */
export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

/** True when a new item would exceed the plan cap. */
export function isAtLimit(count: number, limit: number): boolean {
  return !isUnlimited(limit) && count >= limit;
}
