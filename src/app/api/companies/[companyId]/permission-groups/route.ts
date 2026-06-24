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
  params: Promise<{ companyId: string }>;
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

function serializeDate(value: unknown): string | null {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
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

export async function GET(_req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canManageCompanyPermissions(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const groupsSnap = await adminDb()
    .collection(`companies/${companyId}/permission_groups`)
    .orderBy("updatedAt", "desc")
    .get();

  const groups = groupsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      companyId,
      nameEn: typeof data.nameEn === "string" ? data.nameEn : "",
      nameAr: typeof data.nameAr === "string" ? data.nameAr : "",
      permissions: parsePermissionList(data.permissions) ?? [],
      active: data.active !== false,
      createdAt: serializeDate(data.createdAt),
      updatedAt: serializeDate(data.updatedAt),
    };
  });

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
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

  const groupRef = adminDb()
    .collection(`companies/${companyId}/permission_groups`)
    .doc();

  await groupRef.set({
    companyId,
    nameEn,
    nameAr,
    permissions,
    active: true,
    createdBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json(
    {
      ok: true,
      group: {
        id: groupRef.id,
        companyId,
        nameEn,
        nameAr,
        permissions,
        active: true,
        createdAt: null,
        updatedAt: null,
      },
    },
    { status: 201 },
  );
}
