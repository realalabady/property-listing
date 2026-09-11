import type { Metadata } from "next";
import { PricingPage } from "@/features/landing/PricingPage";
import { getPlanCatalog } from "@/lib/plans/catalog";
import { PLAN_IDS, displayPrice } from "@/constants/plans";
import type { SubscriptionPlanId } from "@/types/company";
import type { PlanDisplayPrice } from "@/types/plan";

export const metadata: Metadata = {
  title: "الباقات",
  description:
    "باقات راعي للشركات العقارية: مبتدئ واحترافي ومؤسسات. قارن الحدود والمزايا واختر الباقة المناسبة لمكتبك.",
};

// Admin-edited prices and offers (with end dates) must show immediately.
export const dynamic = "force-dynamic";

export default async function PricingRoute() {
  const catalog = await getPlanCatalog();
  const now = Date.now();
  const prices = {} as Record<SubscriptionPlanId, PlanDisplayPrice>;
  for (const plan of PLAN_IDS) prices[plan] = displayPrice(catalog[plan], now);

  return <PricingPage prices={prices} />;
}
