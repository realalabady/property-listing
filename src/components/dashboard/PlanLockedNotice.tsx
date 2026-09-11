import Link from "next/link";
import { Lock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { PlanFeature } from "@/constants/plans";
import { planName } from "@/features/plans/plan-labels";
import { getPricingVisible } from "@/lib/plans/catalog";
import { requiredPlanName } from "@/lib/plans/locks";
import type { PlanDefinition } from "@/types/plan";
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
export async function PlanLockedNotice({
  feature,
  currentPlan,
}: {
  feature: PlanFeature;
  currentPlan: PlanDefinition;
}) {
  const [requiredPlan, pricingVisible] = await Promise.all([
    requiredPlanName(feature),
    getPricingVisible(),
  ]);
  const featureLabel = t(FEATURE_LABEL_KEYS[feature]);
  const current = planName(currentPlan);

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
        {requiredPlan && (
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {t("planLock.badge", { plan: requiredPlan })}
          </span>
        )}
        <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground">
          {requiredPlan
            ? t("planLock.title", { feature: featureLabel, plan: requiredPlan })
            : t("planLock.titleUnavailable", { feature: featureLabel })}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {requiredPlan
            ? t("planLock.body", { current, plan: requiredPlan })
            : t("planLock.bodyUnavailable", { current })}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          {pricingVisible && (
            <Link
              href={ROUTES.PRICING}
              className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {t("planLock.viewPlans")}
            </Link>
          )}
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
