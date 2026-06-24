import "server-only";
import { PERMISSIONS, type Permission } from "@/constants/permissions";
import type { SessionUser } from "@/lib/auth/session";

function hasPermission(user: SessionUser, perm: Permission): boolean {
  return (user.permissions as string[]).includes(perm);
}

export function canCreateTask(user: SessionUser, companyId: string): boolean {
  return (
    user.companyId === companyId && hasPermission(user, PERMISSIONS.CREATE_TASK)
  );
}

export function canAssignTasks(user: SessionUser, companyId: string): boolean {
  return (
    user.companyId === companyId &&
    hasPermission(user, PERMISSIONS.ASSIGN_TASKS)
  );
}

export function canCompleteTasks(
  user: SessionUser,
  companyId: string,
): boolean {
  return (
    user.companyId === companyId &&
    hasPermission(user, PERMISSIONS.COMPLETE_TASKS)
  );
}

/** Returns true if the user can see tasks for this company. */
export function canViewTasks(user: SessionUser, companyId: string): boolean {
  return (
    user.companyId === companyId &&
    (hasPermission(user, PERMISSIONS.CREATE_TASK) ||
      hasPermission(user, PERMISSIONS.ASSIGN_TASKS) ||
      hasPermission(user, PERMISSIONS.COMPLETE_TASKS))
  );
}

export function serializeDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    "toDate" in (value as object) &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}
