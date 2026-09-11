import "server-only";
import {
  PLAN_FEATURE_IDS,
  lowestPlanWithFeature,
  planHasFeature,
  type PlanFeature,
} from "@/constants/plans";
import { planName } from "@/features/plans/plan-labels";
import { getPlans } from "@/lib/plans/catalog";
import { t } from "@/lib/i18n";
import type { PlanDefinition } from "@/types/plan";

/** Name of the lowest plan that unlocks `feature`, or null if none does. */
export async function requiredPlanName(
  feature: PlanFeature,
): Promise<string | null> {
  const plan = lowestPlanWithFeature(await getPlans(), feature);
  return plan ? planName(plan) : null;
}

/** Short hint for each feature `plan` lacks, for the dashboard nav. */
export async function lockedFeatureHints(
  plan: PlanDefinition,
): Promise<Partial<Record<PlanFeature, string>>> {
  const hints: Partial<Record<PlanFeature, string>> = {};
  for (const feature of PLAN_FEATURE_IDS) {
    if (planHasFeature(plan, feature)) continue;
    const required = await requiredPlanName(feature);
    hints[feature] = required
      ? t("planLock.lockedHint", { plan: required })
      : t("planLock.unavailableHint");
  }
  return hints;
}
