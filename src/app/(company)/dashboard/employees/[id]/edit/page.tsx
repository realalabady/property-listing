import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { ROLES, isValidRole, type Role } from "@/constants/roles";
import { adminDb } from "@/lib/firebase/admin";
import { PageHeader } from "@/components/ui/page-header";
import {
  EditEmployeeForm,
  type EditEmployeeInitial,
} from "@/features/employees/EditEmployeeForm";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "تعديل الموظف",
};

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCompanyMember();

  const canManage =
    user.role === ROLES.SUPER_ADMIN ||
    hasAnyPermission(user.permissions, [
      PERMISSIONS.CREATE_EMPLOYEE,
      PERMISSIONS.EDIT_EMPLOYEE,
    ]);
  if (!canManage || !user.companyId) {
    redirect(ROUTES.DASHBOARD_EMPLOYEE_DETAIL(id));
  }

  const snap = await adminDb()
    .doc(`companies/${user.companyId}/employees/${id}`)
    .get();
  if (!snap.exists) notFound();

  const data = snap.data() as Record<string, unknown>;
  const role: Role =
    typeof data.role === "string" && isValidRole(data.role)
      ? (data.role as Role)
      : ROLES.VIEWER;

  const initial: EditEmployeeInitial = {
    name: typeof data.name === "string" ? data.name : "",
    role,
    phone: typeof data.phone === "string" ? data.phone : "",
    nationalId: typeof data.nationalId === "string" ? data.nationalId : "",
    title: typeof data.title === "string" ? data.title : "",
    department: typeof data.department === "string" ? data.department : "",
    active: data.active !== false,
  };

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.DASHBOARD_EMPLOYEE_DETAIL(id)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        {t("employeesDash.backToList")}
      </Link>
      <PageHeader title={t("employeesDash.editEmployeeTitle")} description={initial.name} />
      <EditEmployeeForm
        companyId={user.companyId}
        employeeId={id}
        initial={initial}
        isSelf={id === user.uid}
      />
    </div>
  );
}
