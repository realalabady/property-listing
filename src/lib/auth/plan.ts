import "server-only";
import { NextResponse } from "next/server";
import { getCompanyDoc } from "./guards";
import { planHasFeature, type PlanFeature } from "@/constants/plans";
import { getPlan } from "@/lib/plans/catalog";
import type { PlanDefinition } from "@/types/plan";

/** The company's current plan, read through the per-request cached doc. */
export async function getCompanyPlan(
  companyId: string,
): Promise<PlanDefinition> {
  const snap = await getCompanyDoc(companyId);
  return getPlan(snap.exists ? snap.get("subscriptionPlan") : undefined);
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
