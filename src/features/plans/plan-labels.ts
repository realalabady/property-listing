import { isUnlimited } from "@/constants/plans";
import type { PlanDefinition } from "@/types/plan";

const formatSar = (value: number) => value.toLocaleString("en-US");

function limitLabel(limit: number, noun: string): string {
  return isUnlimited(limit) ? `${noun} غير محدود` : `${limit} ${noun}`;
}

/** Arabic display name (falls back to the id for unnamed plans). */
export function planName(plan: Pick<PlanDefinition, "id" | "name">): string {
  return plan.name.ar || plan.name.en || plan.id;
}

/** e.g. "مبتدئ — 2,499 ر.س/سنة · 20 عقار · 2 موظف" */
export function planOptionLabel(plan: PlanDefinition): string {
  return [
    `${planName(plan)} — ${formatSar(plan.priceSar)} ر.س/سنة`,
    limitLabel(plan.maxListings, "عقار"),
    limitLabel(plan.maxEmployees, "موظف"),
  ].join(" · ");
}

/** Plan picker options, labelled with the live plan data. */
export function planOptions(plans: readonly PlanDefinition[]) {
  return plans.map((plan) => ({ value: plan.id, label: planOptionLabel(plan) }));
}

export const PLAN_PRICING_NOTE =
  "الأسعار سنوية ولا تشمل ضريبة القيمة المضافة 15% ولا رسوم التأسيس.";
