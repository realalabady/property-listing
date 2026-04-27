import "server-only";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { isValidRole, type Role } from "@/constants/roles";
import { permissionsForRole, type Permission } from "@/constants/permissions";

/**
 * Custom claims set on the Firebase Auth ID token.
 * Security rules read these directly via `request.auth.token`.
 */
export interface AppClaims {
  role: Role;
  companyId: string | null; // null for super_admin
  permissions: Permission[];
}

/**
 * Atomically recompute and set custom claims for a user.
 *
 * Typically called from Cloud Functions whenever an employee's role changes,
 * or during onboarding / invitation acceptance.
 */
export async function setUserClaims(
  uid: string,
  claims: AppClaims,
): Promise<void> {
  if (!isValidRole(claims.role)) {
    throw new Error(`Invalid role: ${claims.role}`);
  }
  await adminAuth().setCustomUserClaims(uid, {
    role: claims.role,
    companyId: claims.companyId,
    permissions: claims.permissions,
  });
  // Revoke refresh tokens so the next token carries the new claims.
  await adminAuth().revokeRefreshTokens(uid);
}

/**
 * Build claims from a role using the role-permissions map, then apply.
 * Optionally merge `extraPermissions` (per-employee overrides).
 */
export async function applyRoleClaims(
  uid: string,
  role: Role,
  companyId: string | null,
  extraPermissions: Permission[] = [],
): Promise<void> {
  const base = permissionsForRole(role);
  const merged = Array.from(
    new Set<Permission>([...base, ...extraPermissions]),
  );
  await setUserClaims(uid, { role, companyId, permissions: merged });
}

/**
 * Read claims from an ID token (server-side verification).
 */
export async function verifyIdTokenClaims(idToken: string): Promise<{
  uid: string;
  email: string | undefined;
  claims: AppClaims;
}> {
  const decoded = await adminAuth().verifyIdToken(idToken, true);
  return {
    uid: decoded.uid,
    email: decoded.email,
    claims: {
      role: (decoded.role as Role) ?? null,
      companyId: (decoded.companyId as string | null) ?? null,
      permissions: Array.isArray(decoded.permissions)
        ? (decoded.permissions as Permission[])
        : [],
    },
  };
}

/**
 * Helper: fetch the employee document and recompute claims from Firestore.
 * Source of truth for claims is `companies/{cid}/employees/{uid}`.
 */
export async function syncClaimsFromFirestore(
  uid: string,
  companyId: string,
): Promise<void> {
  const snap = await adminDb()
    .doc(`companies/${companyId}/employees/${uid}`)
    .get();

  if (!snap.exists) {
    throw new Error(`Employee ${uid} not found in company ${companyId}`);
  }
  const data = snap.data() as { role: Role; permissions?: Permission[] };
  await applyRoleClaims(uid, data.role, companyId, data.permissions ?? []);
}
