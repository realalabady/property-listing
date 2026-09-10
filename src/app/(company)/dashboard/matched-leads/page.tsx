import { requireCompanyMember } from "@/lib/auth/guards";
import { getCompanyPlan } from "@/lib/auth/plan";
import { planHasFeature } from "@/constants/plans";
import { PlanLockedNotice } from "@/components/dashboard/PlanLockedNotice";
import { canViewMatchedLeads } from "@/lib/api/company-leads";
import { ROUTES } from "@/constants/routes";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { MatchedLeadsClient } from "@/features/matched-leads/MatchedLeadsClient";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("dashPages.matchedLeadsTitle"),
};

export default async function MatchedLeadsPage() {
  const user = await requireCompanyMember();
  if (!canViewMatchedLeads(user, user.companyId as string)) {
    redirect(`${ROUTES.DASHBOARD}?denied=permission`);
  }

  const plan = await getCompanyPlan(user.companyId as string);
  if (!planHasFeature(plan, "matched_leads")) {
    return <PlanLockedNotice feature="matched_leads" currentPlan={plan} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashPages.matchedLeadsTitle")}
        description={t("dashPages.matchedLeadsSubtitle")}
      />
      <MatchedLeadsClient companyId={user.companyId as string} />
    </div>
  );
}
