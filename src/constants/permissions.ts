import { ROLES, type Role } from "./roles";

/**
 * Granular Permission System
 * --------------------------
 * Every sensitive action in the platform maps to a permission string.
 * Permissions are:
 *   1. Embedded in Firebase Auth custom claims (array of strings)
 *   2. Enforced by Firestore Security Rules (`perm in claims.permissions`)
 *   3. Checked client-side via `usePermission('...')` to hide UI
 *
 * Source of truth = role-to-permissions map below. Cloud Functions compute
 * the permission array from the role (+ any custom overrides per employee)
 * and set it into custom claims on every role change.
 */
export const PERMISSIONS = {
  // Listings
  CREATE_LISTING: "create_listing",
  EDIT_LISTING: "edit_listing",
  EDIT_OWN_LISTING: "edit_own_listing",
  DELETE_LISTING: "delete_listing",
  PUBLISH_LISTING: "publish_listing",
  ASSIGN_LISTING: "assign_listing",
  FEATURE_LISTING: "feature_listing",

  // Employees
  CREATE_EMPLOYEE: "create_employee",
  EDIT_EMPLOYEE: "edit_employee",
  REMOVE_EMPLOYEE: "remove_employee",
  VIEW_EMPLOYEES: "view_employees",
  MANAGE_PERMISSION_GROUPS: "manage_permission_groups",

  // Tasks
  CREATE_TASK: "create_task",
  ASSIGN_TASKS: "assign_tasks",
  ESCALATE_TASKS: "escalate_tasks",
  COMPLETE_TASKS: "complete_tasks",

  // Leads
  MANAGE_LEADS: "manage_leads",
  VIEW_OWN_LEADS: "view_own_leads",
  ASSIGN_LEADS: "assign_leads",

  // KPI / Reports
  VIEW_KPI: "view_kpi",
  VIEW_OWN_KPI: "view_own_kpi",
  EXPORT_REPORTS: "export_reports",

  // Company
  COMPANY_SETTINGS_ACCESS: "company_settings_access",
  BILLING_ACCESS: "billing_access",
  MANAGE_BRANDING: "manage_branding",

  // Platform (super admin only)
  PLATFORM_MANAGE_COMPANIES: "platform_manage_companies",
  PLATFORM_MANAGE_BILLING: "platform_manage_billing",
  PLATFORM_VIEW_ANALYTICS: "platform_view_analytics",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ---------------------------------------------------------------------------
// ROLE → PERMISSIONS MAP
// ---------------------------------------------------------------------------
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.COMPANY_OWNER]: [
    PERMISSIONS.CREATE_LISTING,
    PERMISSIONS.EDIT_LISTING,
    PERMISSIONS.DELETE_LISTING,
    PERMISSIONS.PUBLISH_LISTING,
    PERMISSIONS.ASSIGN_LISTING,
    PERMISSIONS.FEATURE_LISTING,
    PERMISSIONS.CREATE_EMPLOYEE,
    PERMISSIONS.EDIT_EMPLOYEE,
    PERMISSIONS.REMOVE_EMPLOYEE,
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.MANAGE_PERMISSION_GROUPS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.ESCALATE_TASKS,
    PERMISSIONS.COMPLETE_TASKS,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.ASSIGN_LEADS,
    PERMISSIONS.VIEW_KPI,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.COMPANY_SETTINGS_ACCESS,
    PERMISSIONS.BILLING_ACCESS,
    PERMISSIONS.MANAGE_BRANDING,
  ],

  [ROLES.COMPANY_ADMIN]: [
    PERMISSIONS.CREATE_LISTING,
    PERMISSIONS.EDIT_LISTING,
    PERMISSIONS.DELETE_LISTING,
    PERMISSIONS.PUBLISH_LISTING,
    PERMISSIONS.ASSIGN_LISTING,
    PERMISSIONS.FEATURE_LISTING,
    PERMISSIONS.CREATE_EMPLOYEE,
    PERMISSIONS.EDIT_EMPLOYEE,
    PERMISSIONS.REMOVE_EMPLOYEE,
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.MANAGE_PERMISSION_GROUPS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.ESCALATE_TASKS,
    PERMISSIONS.COMPLETE_TASKS,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.ASSIGN_LEADS,
    PERMISSIONS.VIEW_KPI,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.COMPANY_SETTINGS_ACCESS,
    PERMISSIONS.MANAGE_BRANDING,
  ],

  [ROLES.MANAGER]: [
    PERMISSIONS.CREATE_LISTING,
    PERMISSIONS.EDIT_LISTING,
    PERMISSIONS.PUBLISH_LISTING,
    PERMISSIONS.ASSIGN_LISTING,
    PERMISSIONS.FEATURE_LISTING,
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.ESCALATE_TASKS,
    PERMISSIONS.COMPLETE_TASKS,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.ASSIGN_LEADS,
    PERMISSIONS.VIEW_KPI,
    PERMISSIONS.EXPORT_REPORTS,
  ],

  [ROLES.SALES]: [
    PERMISSIONS.CREATE_LISTING,
    PERMISSIONS.EDIT_OWN_LISTING,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.VIEW_OWN_LEADS,
    PERMISSIONS.COMPLETE_TASKS,
    PERMISSIONS.VIEW_OWN_KPI,
  ],

  [ROLES.MARKETING]: [
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.VIEW_OWN_LEADS,
    PERMISSIONS.COMPLETE_TASKS,
    PERMISSIONS.VIEW_OWN_KPI,
    PERMISSIONS.FEATURE_LISTING,
  ],

  [ROLES.DATA_ENTRY]: [
    PERMISSIONS.CREATE_LISTING,
    PERMISSIONS.EDIT_OWN_LISTING,
    PERMISSIONS.COMPLETE_TASKS,
    PERMISSIONS.VIEW_OWN_KPI,
  ],

  [ROLES.ACCOUNTANT]: [
    PERMISSIONS.BILLING_ACCESS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_KPI,
  ],

  [ROLES.VIEWER]: [PERMISSIONS.VIEW_EMPLOYEES, PERMISSIONS.VIEW_OWN_KPI],

  // Marketplace customers hold no company permissions.
  [ROLES.CUSTOMER]: [],
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  userPermissions: string[] | undefined | null,
  required: Permission,
): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes(required);
}

export function hasAnyPermission(
  userPermissions: string[] | undefined | null,
  required: Permission[],
): boolean {
  if (!userPermissions) return false;
  return required.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(
  userPermissions: string[] | undefined | null,
  required: Permission[],
): boolean {
  if (!userPermissions) return false;
  return required.every((p) => userPermissions.includes(p));
}
