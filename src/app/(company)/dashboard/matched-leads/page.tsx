import { requireCompanyMember } from "@/lib/auth/guards";
import { canViewAssignedLeads } from "@/lib/api/company-leads";
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
  if (!canViewAssignedLeads(user, user.companyId as string)) {
    redirect(ROUTES.DASHBOARD);
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
