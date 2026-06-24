import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { NewLeadForm } from "@/features/leads/NewLeadForm";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("leadsDash.addLeadTitle"),
};

export default async function NewLeadPage() {
  const user = await requireCompanyMember();

  const canManageLeads = hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_LEADS,
  ]);

  if (!canManageLeads || !user.companyId) {
    redirect(ROUTES.DASHBOARD_LEADS);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("leadsDash.addLeadTitle")}
        description={t("leadsDash.addLeadSubtitle")}
        actions={
          <Button variant="outline" asChild>
            <Link href={ROUTES.DASHBOARD_LEADS}>
              <ArrowRight className="rotate-180" />
              {t("leadsDash.backToList")}
            </Link>
          </Button>
        }
      />
      <NewLeadForm companyId={user.companyId as string} />
    </div>
  );
}
