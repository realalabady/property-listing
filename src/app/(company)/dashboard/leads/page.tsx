import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DashboardLeadsClient } from "@/features/leads/DashboardLeadsClient";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("dashPages.leadsTitle"),
};

export default async function DashboardLeadsPage() {
  const user = await requireCompanyMember();

  const canManageLeads = hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_LEADS,
  ]);

  const canAssignLeads = hasAnyPermission(user.permissions, [
    PERMISSIONS.ASSIGN_LEADS,
    PERMISSIONS.MANAGE_LEADS,
  ]);

  const canCommentOnLeads = hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.VIEW_OWN_LEADS,
  ]);

  const canAccessLeads = canManageLeads || canAssignLeads || canCommentOnLeads;

  if (!canAccessLeads || !user.companyId) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashPages.leadsTitle")}
        description={t("dashPages.leadsSubtitle")}
        actions={
          canManageLeads ? (
            <Button asChild>
              <Link href={ROUTES.DASHBOARD_LEAD_NEW}>
                <Plus />
                {t("leadsDash.addLead")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <DashboardLeadsClient
        companyId={user.companyId as string}
        canManageLeads={canManageLeads}
        canAssignLeads={canAssignLeads}
        canCommentOnLeads={canCommentOnLeads}
        canViewNationalId={canManageLeads}
      />
    </div>
  );
}
