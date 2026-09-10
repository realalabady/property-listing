import "server-only";
import { NextResponse } from "next/server";
import { getCompanyDoc } from "./guards";
import {
  parseSubscriptionPlan,
  planHasFeature,
  type PlanFeature,
} from "@/constants/plans";
import type { SubscriptionPlanId } from "@/types/company";

/** The company's current plan, read through the per-request cached doc. */
export async function getCompanyPlan(
  companyId: string,
): Promise<SubscriptionPlanId> {
  const snap = await getCompanyDoc(companyId);
  return parseSubscriptionPlan(
    snap.exists ? snap.get("subscriptionPlan") : undefined,
  );
}

export async function companyHasFeature(
  companyId: string,
  feature: PlanFeature,
): Promise<boolean> {
  return planHasFeature(await getCompanyPlan(companyId), feature);
}

/** 403 for API calls to a feature the company's plan doesn't include. */
export function planFeatureForbidden(): NextResponse {
  return NextResponse.json(
    {
      error: "This feature isn't included in your plan.",
      code: "plan_upgrade_required",
    },
    { status: 403 },
  );
}
