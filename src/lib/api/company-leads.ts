import { LEAD_STATUSES, type LeadStatus } from "@/constants/listing-categories";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;

/**
 * Company-wide lead visibility, stored at
 * `companies/{cid}/settings/default` under `visibility.leads`:
 * - `"all"`         → any lead viewer sees the whole pool (default / legacy).
 * - `"assigned_only"` → non-privileged employees only see leads assigned to
 *   them, even if they hold `manage_leads`. Owners/admins and holders of
 *   `assign_leads` always see the full pool (they distribute it).
 */
export type LeadsVisibility = "all" | "assigned_only";

const LEAD_STATUS_VALUES = new Set<LeadStatus>(Object.values(LEAD_STATUSES));

/**
 * Reads the effective lead-visibility setting for a company. Defaults to
 * `"all"` when the settings doc or the field is missing so existing companies
 * keep their current (open) behavior until an owner opts in to restriction.
 */
export async function getLeadsVisibility(
  companyId: string,
): Promise<LeadsVisibility> {
  const snap = await adminDb()
    .doc(`companies/${companyId}/settings/default`)
    .get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : null;
  const visibility =
    data && typeof data.visibility === "object" && data.visibility !== null
      ? (data.visibility as Record<string, unknown>).leads
      : undefined;
  return visibility === "assigned_only" ? "assigned_only" : "all";
}

/**
 * "Privileged" users see the entire lead pool regardless of the company's
 * visibility setting: super admins, company owners/admins, and anyone holding
 * `assign_leads` (they must see unassigned leads in order to distribute them).
 */
export function isLeadPoolPrivileged(
  user: SessionUser,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;
  if (user.role === ROLES.COMPANY_OWNER || user.role === ROLES.COMPANY_ADMIN) {
    return true;
  }
  return hasAnyPermission(user.permissions, [PERMISSIONS.ASSIGN_LEADS]);
}

/**
 * Decides whether a user sees the whole lead pool (`"all"`) or only leads
 * assigned to them (`"own"`), given the company's visibility setting.
 * Callers should already have gated on {@link canViewAssignedLeads}.
 */
export function resolveLeadListScope(
  user: SessionUser,
  companyId: string,
  visibility: LeadsVisibility,
): "all" | "own" {
  if (isLeadPoolPrivileged(user, companyId)) return "all";
  // Under restriction, even manage_leads holders are scoped to their own leads.
  if (visibility === "assigned_only") return "own";
  if (!user) return "own";
  return hasAnyPermission(user.permissions, [PERMISSIONS.MANAGE_LEADS])
    ? "all"
    : "own";
}

/**
 * Whether a user may act on ANY lead (move/reprioritize/comment on leads not
 * assigned to them). Mirrors {@link resolveLeadListScope} so write paths honor
 * the same visibility rule as reads.
 */
export function canActOnAnyLead(
  user: SessionUser,
  companyId: string,
  visibility: LeadsVisibility = "all",
): boolean {
  return resolveLeadListScope(user, companyId, visibility) === "all";
}

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
  visibility: LeadsVisibility = "all",
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  if (resolveLeadListScope(user, companyId, visibility) === "all") {
    return true;
  }

  // Scoped to own leads: still needs a lead-viewing permission, plus ownership.
  if (
    !hasAnyPermission(user.permissions, [
      PERMISSIONS.VIEW_OWN_LEADS,
      PERMISSIONS.MANAGE_LEADS,
    ])
  ) {
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
  visibility: LeadsVisibility = "all",
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  if (resolveLeadListScope(user, companyId, visibility) === "all") {
    return true;
  }

  if (
    !hasAnyPermission(user.permissions, [
      PERMISSIONS.VIEW_OWN_LEADS,
      PERMISSIONS.MANAGE_LEADS,
    ])
  ) {
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
  // The company owner has full access to their own company's data.
  if (user.role === ROLES.COMPANY_OWNER) return true;

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
