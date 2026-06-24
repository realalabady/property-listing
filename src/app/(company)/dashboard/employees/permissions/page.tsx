import { redirect } from "next/navigation";
import { PermissionGroupsManager } from "@/features/employees/PermissionGroupsManager";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { adminDb } from "@/lib/firebase/admin";

export const metadata = {
  title: "مجموعات الصلاحيات",
};

export default async function EmployeePermissionGroupsPage() {
  const user = await requireCompanyMember();

  const canManagePermissions = hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_PERMISSION_GROUPS,
    PERMISSIONS.EDIT_EMPLOYEE,
    PERMISSIONS.CREATE_EMPLOYEE,
  ]);

  if (!canManagePermissions || !user.companyId) {
    redirect(ROUTES.DASHBOARD_EMPLOYEES);
  }

  const employeesSnap = await adminDb()
    .collection(`companies/${user.companyId}/employees`)
    .orderBy("name", "asc")
    .limit(200)
    .get();

  const employees = employeesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: typeof data.name === "string" ? data.name : "موظف",
      role: typeof data.role === "string" ? data.role : "viewer",
      permissionGroupIds: Array.isArray(data.permissionGroupIds)
        ? data.permissionGroupIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    };
  });

  return (
    <PermissionGroupsManager companyId={user.companyId} employees={employees} />
  );
}
