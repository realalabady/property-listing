import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getSessionUser, type SessionUser } from "./session";
import { ROUTES } from "@/constants/routes";
import { ROLES, type Role } from "@/constants/roles";
import { hasAnyPermission, type Permission } from "@/constants/permissions";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Cached raw-document fetchers.
 *
 * Wrapped in React `cache()` so a given company/employee doc is read from
 * Firestore at most ONCE per request, no matter how many callers ask for it —
 * the guards below AND the dashboard layout share these, so the same two docs
 * aren't read twice per navigation. Callers that only need a processed subset
 * go through `getCompanyAccessState` / `getEmployeeMembership`; callers that
 * need raw fields (e.g. the layout's company name/logo) read the snapshot.
 */
export const getCompanyDoc = cache(
  (companyId: string): Promise<DocumentSnapshot> =>
    adminDb().doc(`companies/${companyId}`).get(),
);

export const getEmployeeDoc = cache(
  (companyId: string, uid: string): Promise<DocumentSnapshot> =>
    adminDb().doc(`companies/${companyId}/employees/${uid}`).get(),
);

/**
 * Server-side route guards for Next.js App Router layouts & pages.
 *
 * Note: `redirect()` from next/navigation throws an internal error and is
 * typed as returning `never`, so TS narrowing works correctly after install.
 *
 * Usage:
 *   const user = await requireAuth();
 *   const user = await requireCompanyMember();
 *   const user = await requireSuperAdmin();
 *   const user = await requirePermission('create_listing');
 */

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`${ROUTES.LOGIN}?reauth=1`);
  return user;
}

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

interface CompanyAccessState {
  exists: boolean;
  isDeleted: boolean;
  status: string | null;
  trialEndsAtMs: number | null;
}

const getCompanyAccessState = cache(
  async (companyId: string): Promise<CompanyAccessState> => {
    const snap = await getCompanyDoc(companyId);
    if (!snap.exists) {
      return {
        exists: false,
        isDeleted: false,
        status: null,
        trialEndsAtMs: null,
      };
    }

    const data = snap.data() as Record<string, unknown>;
    const status = typeof data.status === "string" ? data.status : null;
    const isDeleted = data.isDeleted === true || Boolean(data.deletedAt);

    return {
      exists: true,
      isDeleted,
      status,
      trialEndsAtMs: toMillis(data.trialEndsAt),
    };
  },
);

/** Why a company's dashboard access is blocked (or `null` when allowed). */
export type CompanyBlockReason =
  | "missing" // company doc gone / soft-deleted → treat as an auth problem
  | "suspended"
  | "cancelled"
  | "trial_expired";

/**
 * Single source of truth for whether a company may use the dashboard.
 * Shared by the route guard and the /plan-ended page so they never disagree.
 * A `trial` company whose `trialEndsAt` has passed is treated as expired even
 * though its status string is still "trial" (expiry is time-based).
 */
export function getCompanyBlockReason(
  state: CompanyAccessState,
): CompanyBlockReason | null {
  if (!state.exists || state.isDeleted) return "missing";
  if (state.status === "suspended") return "suspended";
  if (state.status === "cancelled") return "cancelled";
  if (
    state.status === "trial" &&
    state.trialEndsAtMs !== null &&
    state.trialEndsAtMs <= Date.now()
  ) {
    return "trial_expired";
  }
  return null;
}

/**
 * Resolve the current user's company block reason, or `null` if they have no
 * company / aren't a company member. Used by the /plan-ended page.
 */
export async function getCompanyBlockReasonForUser(
  user: SessionUser,
): Promise<CompanyBlockReason | null> {
  if (!user.companyId) return null;
  const state = await getCompanyAccessState(user.companyId);
  return getCompanyBlockReason(state);
}

const getEmployeeMembership = cache(async (companyId: string, uid: string) => {
  const snap = await getEmployeeDoc(companyId, uid);
  if (!snap.exists) {
    return { exists: false, active: false };
  }
  const data = snap.data() as Record<string, unknown>;
  // Treat a missing `active` field as active (legacy docs); only an explicit
  // `active: false` locks the member out.
  return { exists: true, active: data.active !== false };
});

export async function requireCompanyMember(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role === ROLES.SUPER_ADMIN) {
    redirect(ROUTES.ADMIN);
  }
  // Marketplace customers have no company — keep them out of the dashboard.
  if (user.role === ROLES.CUSTOMER) {
    redirect(ROUTES.MARKETPLACE);
  }
  if (!user.companyId) {
    redirect(ROUTES.ONBOARDING);
  }

  // Fetch the company and employee docs in parallel — one round-trip, not two.
  // (Deactivated/removed employees keep a valid session cookie until it
  // expires, so the live employee doc is checked on every render.)
  const [company, membership] = await Promise.all([
    getCompanyAccessState(user.companyId),
    getEmployeeMembership(user.companyId, user.uid),
  ]);
  const blockReason = getCompanyBlockReason(company);

  if (blockReason) {
    // A missing/deleted company is an auth-level problem → back to login.
    // Billing/trial blocks get the dedicated "plan ended" screen so the user
    // sees a clear renew / contact-support message instead of a login bounce.
    if (blockReason === "missing") {
      redirect(`${ROUTES.LOGIN}?reauth=1&blocked=company_inactive`);
    }
    redirect(ROUTES.PLAN_ENDED);
  }

  if (!membership.exists || !membership.active) {
    redirect(`${ROUTES.LOGIN}?reauth=1&blocked=company_inactive`);
  }

  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== ROLES.SUPER_ADMIN) {
    redirect(ROUTES.DASHBOARD);
  }
  return user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.role || !roles.includes(user.role)) {
    redirect(ROUTES.DASHBOARD);
  }
  return user;
}

export async function requirePermission(
  perms: Permission | Permission[],
): Promise<SessionUser> {
  const user = await requireAuth();
  const required = Array.isArray(perms) ? perms : [perms];
  if (!hasAnyPermission(user.permissions, required)) {
    redirect(ROUTES.DASHBOARD);
  }
  return user;
}
