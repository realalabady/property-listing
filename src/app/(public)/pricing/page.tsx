import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PricingPage } from "@/features/landing/PricingPage";
import { getPlans, getPricingVisible } from "@/lib/plans/catalog";
import { getSessionUser } from "@/lib/auth/session";
import { toPublicPlan } from "@/constants/plans";
import { ROLES } from "@/constants/roles";

export const metadata: Metadata = {
  title: "الباقات",
  description:
    "باقات راعي للشركات العقارية. قارن الحدود والمزايا واختر الباقة المناسبة لمكتبك.",
};

// Admin-edited plans, offers (with end dates) and the show/hide switch must
// apply immediately.
export const dynamic = "force-dynamic";

export default async function PricingRoute() {
  const [visible, plans] = await Promise.all([getPricingVisible(), getPlans()]);

  // Hidden: visitors get a 404; super admins can still preview it.
  let preview = false;
  if (!visible) {
    const user = await getSessionUser();
    if (user?.role !== ROLES.SUPER_ADMIN) notFound();
    preview = true;
  }

  const now = Date.now();
  return (
    <PricingPage
      plans={plans.map((plan) => toPublicPlan(plan, now))}
      preview={preview}
    />
  );
}
