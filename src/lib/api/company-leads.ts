import { LEAD_STATUSES, type LeadStatus } from "@/constants/listing-categories";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";

export type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;

const LEAD_STATUS_VALUES = new Set<LeadStatus>(Object.values(LEAD_STATUSES));

export function canManageCompanyLeads(
  user: SessionUser,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.ASSIGN_LEADS,
  ]);
}

export function canAccessLeadDocument(
  user: SessionUser,
  companyId: string,
  leadData: Record<string, unknown>,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  if (
    hasAnyPermission(user.permissions, [
      PERMISSIONS.MANAGE_LEADS,
      PERMISSIONS.ASSIGN_LEADS,
    ])
  ) {
    return true;
  }

  if (!hasAnyPermission(user.permissions, [PERMISSIONS.VIEW_OWN_LEADS])) {
    return false;
  }

  return (
    typeof leadData.assignedTo === "string" && leadData.assignedTo === user.uid
  );
}

export function canCommentOnLead(
  user: SessionUser,
  companyId: string,
  leadData: Record<string, unknown>,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  if (hasAnyPermission(user.permissions, [PERMISSIONS.MANAGE_LEADS])) {
    return true;
  }

  if (!hasAnyPermission(user.permissions, [PERMISSIONS.VIEW_OWN_LEADS])) {
    return false;
  }

  return (
    typeof leadData.assignedTo === "string" && leadData.assignedTo === user.uid
  );
}

export function canAssignCompanyLeads(
  user: SessionUser,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [PERMISSIONS.ASSIGN_LEADS]);
}

export function canViewAssignedLeads(
  user: SessionUser,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [
    PERMISSIONS.VIEW_OWN_LEADS,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.ASSIGN_LEADS,
  ]);
}

/**
 * Matched leads expose company-wide customer PII (not assignment-scoped), so
 * they require the dedicated VIEW_MATCHED_LEADS permission (or full lead
 * management) — never the "view own leads" permission.
 */
export function canViewMatchedLeads(
  user: SessionUser,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [
    PERMISSIONS.VIEW_MATCHED_LEADS,
    PERMISSIONS.MANAGE_LEADS,
  ]);
}

export function parseLeadStatus(value: unknown): LeadStatus | null {
  if (typeof value !== "string") return null;
  if (!LEAD_STATUS_VALUES.has(value as LeadStatus)) return null;
  return value as LeadStatus;
}

export function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

export function serializeDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === "string") return value;
  return null;
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}
