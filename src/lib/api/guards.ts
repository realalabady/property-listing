import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { ROLES } from "@/constants/roles";
import type { SessionUser } from "@/lib/auth/session";

export type ActiveMemberCheck =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Re-validate against Firestore what the session cookie can't be trusted for:
 * the employee is still active AND the company is still usable. Claims live in
 * the cookie until it expires, so a deactivated employee or a suspended company
 * would otherwise keep mutating data through API routes.
 *
 * Call this in every mutating company-scoped route AFTER the permission check.
 */
export async function assertActiveMember(
  user: SessionUser,
  companyId: string,
): Promise<ActiveMemberCheck> {
  if (user.role === ROLES.SUPER_ADMIN) return { ok: true };
  if (user.companyId !== companyId) {
    return { ok: false, status: 403, error: "Forbidden." };
  }

  const [companySnap, employeeSnap] = await Promise.all([
    adminDb().doc(`companies/${companyId}`).get(),
    adminDb().doc(`companies/${companyId}/employees/${user.uid}`).get(),
  ]);

  if (!companySnap.exists) {
    return { ok: false, status: 403, error: "Company is not active." };
  }
  const company = companySnap.data() as Record<string, unknown>;
  const status = typeof company.status === "string" ? company.status : "trial";
  const blocked =
    status === "suspended" ||
    status === "cancelled" ||
    company.isDeleted === true ||
    Boolean(company.deletedAt);
  if (blocked) {
    return { ok: false, status: 403, error: "Company is not active." };
  }

  // Missing `active` on legacy employee docs counts as active; only an
  // explicit `active: false` locks the member out (mirrors requireCompanyMember).
  if (!employeeSnap.exists || employeeSnap.get("active") === false) {
    return { ok: false, status: 403, error: "Account is not active." };
  }

  return { ok: true };
}
