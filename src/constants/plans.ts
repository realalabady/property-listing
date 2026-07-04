import type { SubscriptionPlanId } from "@/types/company";

/**
 * Per-plan quotas. `-1` means unlimited. These are the real limits enforced
 * server-side on listing/employee creation (see the listings + employees APIs).
 */
export interface PlanLimits {
  maxListings: number;
  maxEmployees: number;
}

export const PLAN_LIMITS: Record<SubscriptionPlanId, PlanLimits> = {
  free: { maxListings: 5, maxEmployees: 2 },
  starter: { maxListings: 25, maxEmployees: 5 },
  pro: { maxListings: 100, maxEmployees: 20 },
  enterprise: { maxListings: -1, maxEmployees: -1 },
};

export function limitsForPlan(plan: SubscriptionPlanId): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

/** A limit of -1 means "no cap". */
export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

/** True when a new item would exceed the plan cap. */
export function isAtLimit(count: number, limit: number): boolean {
  return !isUnlimited(limit) && count >= limit;
}
