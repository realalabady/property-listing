import { redirect } from "next/navigation";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/components/ui/page-header";
import { LeadsArrivedClient } from "@/features/leads/LeadsArrivedClient";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("dashPages.leadsArrivedTitle"),
};

export default async function LeadsArrivedPage() {
  const user = await requireCompanyMember();

  const canManageLeads = hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.ASSIGN_LEADS,
  ]);
  const canViewLeads =
    canManageLeads ||
    hasAnyPermission(user.permissions, [PERMISSIONS.VIEW_OWN_LEADS]);

  if (!canViewLeads || !user.companyId) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashPages.leadsArrivedTitle")}
        description={t("dashPages.leadsArrivedSubtitle")}
      />
      <LeadsArrivedClient canManageLeads={canManageLeads} />
    </div>
  );
}
