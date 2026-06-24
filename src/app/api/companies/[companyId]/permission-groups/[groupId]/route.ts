import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { GROUP_ASSIGNABLE_PERMISSIONS } from "@/constants/permission-modules";
import {
  PERMISSIONS,
  hasAnyPermission,
  type Permission,
} from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const assignablePermissions = new Set<Permission>(GROUP_ASSIGNABLE_PERMISSIONS);

interface RouteContext {
  params: Promise<{ companyId: string; groupId: string }>;
}

function normalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parsePermissionList(value: unknown): Permission[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const next = new Set<Permission>();
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    if (!assignablePermissions.has(entry as Permission)) return null;
    next.add(entry as Permission);
  }

  return Array.from(next);
}

function canManageCompanyPermissions(
  user: Awaited<ReturnType<typeof getSessionUser>>,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_PERMISSION_GROUPS,
    PERMISSIONS.EDIT_EMPLOYEE,
    PERMISSIONS.CREATE_EMPLOYEE,
  ]);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { companyId, groupId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canManageCompanyPermissions(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as {
    nameEn?: string;
    nameAr?: string;
    permissions?: unknown;
    active?: boolean;
  };

  const nameEn = normalizeName(body.nameEn);
  const nameAr = normalizeName(body.nameAr);
  const permissions = parsePermissionList(body.permissions);

  if (nameEn.length < 2 || nameAr.length < 2) {
    return NextResponse.json(
      { error: "Group names must be at least 2 characters." },
      { status: 400 },
    );
  }

  if (!permissions) {
    return NextResponse.json(
      { error: "Invalid permission list for group." },
      { status: 400 },
    );
  }

  const groupRef = adminDb().doc(
    `companies/${companyId}/permission_groups/${groupId}`,
  );
  const groupSnap = await groupRef.get();

  if (!groupSnap.exists) {
    return NextResponse.json(
      { error: "Permission group not found." },
      { status: 404 },
    );
  }

  const active = body.active === undefined ? true : Boolean(body.active);

  await groupRef.update({
    nameEn,
    nameAr,
    permissions,
    active,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    group: {
      id: groupId,
      companyId,
      nameEn,
      nameAr,
      permissions,
      active,
      createdAt: null,
      updatedAt: null,
    },
  });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { companyId, groupId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canManageCompanyPermissions(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const groupRef = adminDb().doc(
    `companies/${companyId}/permission_groups/${groupId}`,
  );
  const groupSnap = await groupRef.get();

  if (!groupSnap.exists) {
    return NextResponse.json(
      { error: "Permission group not found." },
      { status: 404 },
    );
  }

  const assignedSnap = await adminDb()
    .collection(`companies/${companyId}/employees`)
    .where("permissionGroupIds", "array-contains", groupId)
    .get();

  if (!assignedSnap.empty) {
    let batch = adminDb().batch();
    let operations = 0;

    for (const employeeDoc of assignedSnap.docs) {
      batch.update(employeeDoc.ref, {
        permissionGroupIds: FieldValue.arrayRemove(groupId),
        updatedAt: FieldValue.serverTimestamp(),
      });
      operations += 1;

      if (operations === 450) {
        await batch.commit();
        batch = adminDb().batch();
        operations = 0;
      }
    }

    if (operations > 0) {
      await batch.commit();
    }
  }

  await groupRef.delete();

  return NextResponse.json({ ok: true });
}
