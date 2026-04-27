/**
 * User Roles
 * ----------
 * Roles are stored in Firebase Auth custom claims AND mirrored in Firestore
 * (companies/{cid}/employees/{uid}.role). Claims are the enforcement layer;
 * Firestore is the editable source of truth that Cloud Functions sync to claims.
 */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  COMPANY_OWNER: "company_owner",
  COMPANY_ADMIN: "company_admin",
  MANAGER: "manager",
  SALES: "sales",
  MARKETING: "marketing",
  DATA_ENTRY: "data_entry",
  ACCOUNTANT: "accountant",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.COMPANY_OWNER]: "Company Owner",
  [ROLES.COMPANY_ADMIN]: "Company Admin",
  [ROLES.MANAGER]: "Manager",
  [ROLES.SALES]: "Sales",
  [ROLES.MARKETING]: "Marketing",
  [ROLES.DATA_ENTRY]: "Data Entry",
  [ROLES.ACCOUNTANT]: "Accountant",
  [ROLES.VIEWER]: "Viewer",
};

export const ASSIGNABLE_ROLES: Role[] = [
  ROLES.COMPANY_ADMIN,
  ROLES.MANAGER,
  ROLES.SALES,
  ROLES.MARKETING,
  ROLES.DATA_ENTRY,
  ROLES.ACCOUNTANT,
  ROLES.VIEWER,
];

export function isValidRole(value: unknown): value is Role {
  return (
    typeof value === "string" && Object.values(ROLES).includes(value as Role)
  );
}
