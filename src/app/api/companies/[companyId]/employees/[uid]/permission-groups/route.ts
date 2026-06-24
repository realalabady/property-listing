import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; uid: string }>;
}

function parseGroupIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const next = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    next.add(trimmed);
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
  const { companyId, uid } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canManageCompanyPermissions(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as {
    permissionGroupIds?: unknown;
  };

  const permissionGroupIds = parseGroupIds(body.permissionGroupIds);
  if (!permissionGroupIds) {
    return NextResponse.json(
      { error: "permissionGroupIds must be an array of strings." },
      { status: 400 },
    );
  }

  if (permissionGroupIds.length > 25) {
    return NextResponse.json(
      { error: "You can assign up to 25 permission groups per employee." },
      { status: 400 },
    );
  }

  if (permissionGroupIds.length > 0) {
    const refs = permissionGroupIds.map((id) =>
      adminDb().doc(`companies/${companyId}/permission_groups/${id}`),
    );
    const snaps = await adminDb().getAll(...refs);

    const missing = snaps.some(
      (snap) => !snap.exists || snap.get("active") === false,
    );
    if (missing) {
      return NextResponse.json(
        { error: "One or more permission groups are missing or inactive." },
        { status: 400 },
      );
    }
  }

  const employeeRef = adminDb().doc(`companies/${companyId}/employees/${uid}`);
  const employeeSnap = await employeeRef.get();

  if (!employeeSnap.exists) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  await employeeRef.update({
    permissionGroupIds,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, permissionGroupIds });
}
