import { redirect } from "next/navigation";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { ROLES, isValidRole } from "@/constants/roles";
import { DashboardEmployeesClient } from "@/features/employees/DashboardEmployeesClient";
import { requireCompanyMember } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";

export const metadata = {
  title: "الموظفون",
};

export default async function DashboardEmployeesPage() {
  const user = await requireCompanyMember();

  const canViewEmployees = hasAnyPermission(user.permissions, [
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.CREATE_EMPLOYEE,
    PERMISSIONS.EDIT_EMPLOYEE,
    PERMISSIONS.REMOVE_EMPLOYEE,
  ]);

  if (!canViewEmployees || !user.companyId) {
    redirect(ROUTES.DASHBOARD);
  }

  const canManageEmployees =
    user.role === ROLES.SUPER_ADMIN ||
    hasAnyPermission(user.permissions, [
      PERMISSIONS.CREATE_EMPLOYEE,
      PERMISSIONS.EDIT_EMPLOYEE,
      PERMISSIONS.REMOVE_EMPLOYEE,
    ]);

  const employeesSnap = await adminDb()
    .collection(`companies/${user.companyId}/employees`)
    .orderBy("name", "asc")
    .limit(300)
    .get();

  const initialEmployees = employeesSnap.docs.map((doc) => {
    const data = doc.data();
    const role =
      typeof data.role === "string" && isValidRole(data.role)
        ? data.role
        : ROLES.VIEWER;

    return {
      id: doc.id,
      email: typeof data.email === "string" ? data.email : "",
      name: typeof data.name === "string" ? data.name : "موظف",
      role,
      permissionGroupIds: Array.isArray(data.permissionGroupIds)
        ? data.permissionGroupIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      title: typeof data.title === "string" ? data.title : null,
      department: typeof data.department === "string" ? data.department : null,
      phone: typeof data.phone === "string" ? data.phone : null,
      active: data.active !== false,
      joinedAt:
        typeof data.joinedAt?.toDate === "function"
          ? data.joinedAt.toDate().toISOString()
          : null,
      updatedAt:
        typeof data.updatedAt?.toDate === "function"
          ? data.updatedAt.toDate().toISOString()
          : null,
    };
  });

  const invitationsSnap = await adminDb()
    .collection(`companies/${user.companyId}/invitations`)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const initialInvitations = invitationsSnap.docs.map((doc) => {
    const data = doc.data();
    const role =
      typeof data.role === "string" && isValidRole(data.role)
        ? data.role
        : ROLES.VIEWER;
    const status =
      typeof data.status === "string" &&
      ["pending", "accepted", "expired", "revoked"].includes(data.status)
        ? (data.status as "pending" | "accepted" | "expired" | "revoked")
        : "pending";

    return {
      id: doc.id,
      email: typeof data.email === "string" ? data.email : "",
      name: typeof data.name === "string" ? data.name : null,
      role,
      status,
      expiresAt:
        typeof data.expiresAt?.toDate === "function"
          ? data.expiresAt.toDate().toISOString()
          : null,
      createdAt:
        typeof data.createdAt?.toDate === "function"
          ? data.createdAt.toDate().toISOString()
          : null,
    };
  });

  return (
    <DashboardEmployeesClient
      companyId={user.companyId}
      currentUserId={user.uid}
      canManageEmployees={canManageEmployees}
      initialEmployees={initialEmployees}
      initialInvitations={initialInvitations}
    />
  );
}
