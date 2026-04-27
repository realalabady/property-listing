import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";
import { ROUTES } from "@/constants/routes";
import { ROLES, type Role } from "@/constants/roles";
import { hasAnyPermission, type Permission } from "@/constants/permissions";

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
  if (!user) redirect(ROUTES.LOGIN);
  return user;
}

export async function requireCompanyMember(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role === ROLES.SUPER_ADMIN) {
    redirect(ROUTES.ADMIN);
  }
  if (!user.companyId) {
    redirect(ROUTES.ONBOARDING);
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
