import {
  PLAN_IDS,
  PLAN_PRICES_SAR,
  isUnlimited,
  limitsForPlan,
} from "@/constants/plans";
import type { SubscriptionPlanId } from "@/types/company";
import { t } from "@/lib/i18n";

export const PLAN_LABEL_KEYS: Record<SubscriptionPlanId, string> = {
  starter: "adminForm.planStarter",
  pro: "adminForm.planPro",
  enterprise: "adminForm.planEnterprise",
};

const formatSar = (value: number) => value.toLocaleString("en-US");

function limitLabel(limit: number, noun: string): string {
  return isUnlimited(limit) ? `${noun} غير محدود` : `${limit} ${noun}`;
}

export type PlanPrices = Record<SubscriptionPlanId, number>;

/** e.g. "مبتدئ — 2,499 ر.س/سنة · 20 عقار · 2 موظف" */
export function planOptionLabel(
  plan: SubscriptionPlanId,
  priceSar: number = PLAN_PRICES_SAR[plan],
): string {
  const { maxListings, maxEmployees } = limitsForPlan(plan);
  return [
    `${t(PLAN_LABEL_KEYS[plan])} — ${formatSar(priceSar)} ر.س/سنة`,
    limitLabel(maxListings, "عقار"),
    limitLabel(maxEmployees, "موظف"),
  ].join(" · ");
}

/** Plan picker options, labelled with the live (admin-edited) prices. */
export function planOptions(prices: PlanPrices) {
  return PLAN_IDS.map((value) => ({
    value,
    label: planOptionLabel(value, prices[value]),
  }));
}

export const PLAN_PRICING_NOTE =
  "الأسعار سنوية ولا تشمل ضريبة القيمة المضافة 15% ولا رسوم التأسيس.";
