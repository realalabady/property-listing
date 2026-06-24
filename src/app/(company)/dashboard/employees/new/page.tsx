import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { NewEmployeeForm } from "@/features/employees/NewEmployeeForm";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("employeesDash.addEmployeeTitle"),
};

export default async function NewEmployeePage() {
  const user = await requireCompanyMember();

  const canManageEmployees =
    user.role === ROLES.SUPER_ADMIN ||
    hasAnyPermission(user.permissions, [
      PERMISSIONS.CREATE_EMPLOYEE,
      PERMISSIONS.EDIT_EMPLOYEE,
      PERMISSIONS.REMOVE_EMPLOYEE,
    ]);

  if (!canManageEmployees || !user.companyId) {
    redirect(ROUTES.DASHBOARD_EMPLOYEES);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("employeesDash.addEmployeeTitle")}
        description={t("employeesDash.addEmployeeSubtitle")}
        actions={
          <Button variant="outline" asChild>
            <Link href={ROUTES.DASHBOARD_EMPLOYEES}>
              <ArrowRight className="rotate-180" />
              {t("employeesDash.backToList")}
            </Link>
          </Button>
        }
      />
      <NewEmployeeForm companyId={user.companyId as string} />
    </div>
  );
}
