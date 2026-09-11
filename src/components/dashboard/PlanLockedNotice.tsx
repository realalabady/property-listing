import Link from "next/link";
import { Lock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { lowestPlanWithFeature, type PlanFeature } from "@/constants/plans";
import { PLAN_LABEL_KEYS } from "@/features/plans/plan-labels";
import type { SubscriptionPlanId } from "@/types/company";
import { t } from "@/lib/i18n";

const FEATURE_LABEL_KEYS: Record<PlanFeature, string> = {
  auctions: "planLock.featureAuctions",
  kpi: "planLock.featureKpi",
  pipeline: "planLock.featurePipeline",
  matched_leads: "planLock.featureMatchedLeads",
};

/**
 * Shown in place of a dashboard feature the company's plan doesn't include.
 * The matching API routes return 403 `plan_upgrade_required` independently.
 */
export function PlanLockedNotice({
  feature,
  currentPlan,
}: {
  feature: PlanFeature;
  currentPlan: SubscriptionPlanId;
}) {
  const requiredPlan = t(PLAN_LABEL_KEYS[lowestPlanWithFeature(feature)]);
  const featureLabel = t(FEATURE_LABEL_KEYS[feature]);

  // Same optional support channels as the plan-ended screen.
  const supportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim();
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  const whatsappHref = supportWhatsapp
    ? `https://wa.me/${supportWhatsapp.replace(/[^\d]/g, "")}`
    : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" aria-hidden />
        </div>
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {t("planLock.badge", { plan: requiredPlan })}
        </span>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground">
          {t("planLock.title", { feature: featureLabel, plan: requiredPlan })}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("planLock.body", {
            current: t(PLAN_LABEL_KEYS[currentPlan]),
            plan: requiredPlan,
          })}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href={ROUTES.PRICING}
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {t("planLock.viewPlans")}
          </Link>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              {t("planLock.contactWhatsapp")}
            </a>
          ) : supportEmail ? (
            <a
              href={`mailto:${supportEmail}`}
              className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              {t("planLock.contactEmail")}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
