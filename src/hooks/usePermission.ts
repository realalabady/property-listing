"use client";

import { useAuthStore } from "@/store/auth.store";
import {
  hasPermission as check,
  hasAnyPermission,
  hasAllPermissions,
  type Permission,
} from "@/constants/permissions";
import { ROLES } from "@/constants/roles";

/**
 * Hook for client-side permission checks (hides UI, enables optimistic flows).
 * Firestore rules remain the source of enforcement.
 */
export function usePermission(permission: Permission): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return check(user.permissions, permission);
}

export function useAnyPermission(permissions: Permission[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return hasAnyPermission(user.permissions, permissions);
}

export function useAllPermissions(permissions: Permission[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return hasAllPermissions(user.permissions, permissions);
}

export function useRole() {
  const user = useAuthStore((s) => s.user);
  return user?.role ?? null;
}

export function useIsSuperAdmin(): boolean {
  const user = useAuthStore((s) => s.user);
  return user?.role === ROLES.SUPER_ADMIN;
}
