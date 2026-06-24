import {
  type Permission,
  PERMISSIONS,
  hasAnyPermission,
} from "@/constants/permissions";
import { ROLES, isValidRole, type Role } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";

export type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;

const NON_PLATFORM_PERMISSIONS = Object.values(PERMISSIONS).filter(
  (perm) => !perm.startsWith("platform_"),
) as Permission[];

const ALL_PERMISSIONS = new Set<Permission>(Object.values(PERMISSIONS));
const ASSIGNABLE_COMPANY_PERMISSIONS = new Set<Permission>(
  NON_PLATFORM_PERMISSIONS,
);

const ASSIGNABLE_EMPLOYEE_ROLES = new Set<Role>([
  ROLES.COMPANY_ADMIN,
  ROLES.MANAGER,
  ROLES.SALES,
  ROLES.MARKETING,
  ROLES.DATA_ENTRY,
  ROLES.ACCOUNTANT,
  ROLES.VIEWER,
]);

export function canViewCompanyEmployees(
  user: SessionUser,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.CREATE_EMPLOYEE,
    PERMISSIONS.EDIT_EMPLOYEE,
    PERMISSIONS.REMOVE_EMPLOYEE,
  ]);
}

export function canManageCompanyEmployees(
  user: SessionUser,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [
    PERMISSIONS.CREATE_EMPLOYEE,
    PERMISSIONS.EDIT_EMPLOYEE,
  ]);
}

export function canRemoveCompanyEmployees(
  user: SessionUser,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [PERMISSIONS.REMOVE_EMPLOYEE]);
}

export function normalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.replace(/\s+/g, " ").trim();
  return next.length > 0 ? next : null;
}

export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseAssignableEmployeeRole(
  value: unknown,
  options?: { allowOwnerRole?: boolean },
): Role | null {
  if (!isValidRole(value)) return null;
  if (options?.allowOwnerRole && value === ROLES.COMPANY_OWNER) {
    return value;
  }
  if (!ASSIGNABLE_EMPLOYEE_ROLES.has(value)) return null;
  return value;
}

export function parsePermissionOverrides(
  value: unknown,
  options?: { allowEmpty?: boolean; allowPlatformPermissions?: boolean },
): Permission[] | null {
  const allowEmpty = options?.allowEmpty ?? true;
  const allowPlatformPermissions = options?.allowPlatformPermissions ?? false;

  if (value === undefined) {
    return allowEmpty ? [] : null;
  }

  if (!Array.isArray(value)) return null;

  const next = new Set<Permission>();
  for (const entry of value) {
    if (typeof entry !== "string") return null;

    const permission = entry as Permission;
    if (!ALL_PERMISSIONS.has(permission)) return null;
    if (
      !allowPlatformPermissions &&
      !ASSIGNABLE_COMPANY_PERMISSIONS.has(permission)
    ) {
      return null;
    }

    next.add(permission);
  }

  if (!allowEmpty && next.size === 0) return null;
  return Array.from(next);
}

export function serializeDate(value: unknown): string | null {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

export function emptyEmployeeKpi() {
  return {
    listingsCreated: 0,
    listingsActive: 0,
    callsMade: 0,
    leadsAssigned: 0,
    leadsConverted: 0,
    dealsClosed: 0,
    avgResponseMinutes: 0,
    tasksCompleted: 0,
    tasksOverdue: 0,
  };
}

export function fallbackName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Employee";
}
