import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { type Permission } from "@/constants/permissions";
import { ROLES, isValidRole, type Role } from "@/constants/roles";
import { applyRoleClaims } from "@/lib/auth/claims";
import { getSessionUser } from "@/lib/auth/session";
import {
  canManageCompanyEmployees,
  canRemoveCompanyEmployees,
  normalizeName,
  normalizeOptionalText,
  parseAssignableEmployeeRole,
  parsePermissionOverrides,
} from "@/lib/api/company-employees";
import { isFieldValueTaken } from "@/lib/api/uniqueness";
import { isValidNationalId, normalizeSaudiPhone } from "@/lib/utils/validation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; uid: string }>;
}

interface UpdateEmployeeBody {
  name?: string;
  role?: string;
  permissions?: unknown;
  phone?: string;
  department?: string;
  title?: string;
  active?: boolean;
  nationalId?: string;
}

async function clearEmployeeClaims(uid: string) {
  await adminAuth().setCustomUserClaims(uid, {
    role: null,
    companyId: null,
    permissions: [],
  });
  await adminAuth().revokeRefreshTokens(uid);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { companyId, uid } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canManageCompanyEmployees(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const employeeRef = adminDb().doc(`companies/${companyId}/employees/${uid}`);
  const employeeSnap = await employeeRef.get();
  if (!employeeSnap.exists) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const body = (await req.json()) as UpdateEmployeeBody;
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  const nextName = normalizeName(body.name);
  if (nextName) {
    updates.name = nextName;
  }

  const employeesPath = `companies/${companyId}/employees`;

  const rawPhone = normalizeOptionalText(body.phone);
  if (rawPhone) {
    const phone = normalizeSaudiPhone(rawPhone);
    if (!phone) {
      return NextResponse.json(
        { error: "رقم جوال سعودي غير صالح." },
        { status: 400 },
      );
    }
    if (await isFieldValueTaken(employeesPath, "phone", phone, uid)) {
      return NextResponse.json(
        { error: "رقم الجوال مستخدم بالفعل لموظف آخر." },
        { status: 409 },
      );
    }
    updates.phone = phone;
  }

  if (body.nationalId !== undefined) {
    const nationalId = normalizeOptionalText(body.nationalId) ?? "";
    if (!isValidNationalId(nationalId)) {
      return NextResponse.json(
        { error: "رقم الهوية يجب أن يكون 10 أرقام." },
        { status: 400 },
      );
    }
    if (await isFieldValueTaken(employeesPath, "nationalId", nationalId, uid)) {
      return NextResponse.json(
        { error: "رقم الهوية مستخدم بالفعل لموظف آخر." },
        { status: 409 },
      );
    }
    updates.nationalId = nationalId;
  }

  const department = normalizeOptionalText(body.department);
  if (department) {
    updates.department = department;
  }

  const title = normalizeOptionalText(body.title);
  if (title) {
    updates.title = title;
  }

  let nextRole: Role =
    typeof employeeSnap.get("role") === "string" &&
    isValidRole(employeeSnap.get("role"))
      ? employeeSnap.get("role")
      : ROLES.VIEWER;
  if (body.role !== undefined) {
    const parsedRole = parseAssignableEmployeeRole(body.role);
    if (!parsedRole) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    nextRole = parsedRole;
    updates.role = parsedRole;
  }

  let nextPermissions: Permission[] =
    parsePermissionOverrides(employeeSnap.get("permissions"), {
      allowEmpty: true,
      allowPlatformPermissions: true,
    }) ?? [];

  if (body.permissions !== undefined) {
    const parsedPermissions = parsePermissionOverrides(body.permissions, {
      allowEmpty: true,
      allowPlatformPermissions: user.role === ROLES.SUPER_ADMIN,
    });

    if (!parsedPermissions) {
      return NextResponse.json(
        { error: "Invalid permissions list." },
        { status: 400 },
      );
    }

    nextPermissions = parsedPermissions;
    updates.permissions = parsedPermissions;
  }

  let nextActive = employeeSnap.get("active") !== false;
  if (typeof body.active === "boolean") {
    if (uid === user.uid && body.active === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account." },
        { status: 400 },
      );
    }

    nextActive = body.active;
    updates.active = body.active;
    if (body.active === false) {
      updates.deactivatedAt = FieldValue.serverTimestamp();
    }
  }

  const touchedFields = Object.keys(updates).length;
  if (touchedFields <= 1) {
    return NextResponse.json(
      { error: "No valid fields were provided for update." },
      { status: 400 },
    );
  }

  await employeeRef.update(updates);

  if (!nextActive) {
    await clearEmployeeClaims(uid);
  } else {
    await applyRoleClaims(uid, nextRole, companyId, nextPermissions);
  }

  return NextResponse.json({
    ok: true,
    employee: {
      id: uid,
      role: nextRole,
      permissions: nextPermissions,
      active: nextActive,
    },
  });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { companyId, uid } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canRemoveCompanyEmployees(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (uid === user.uid) {
    return NextResponse.json(
      { error: "You cannot remove your own account." },
      { status: 400 },
    );
  }

  const employeeRef = adminDb().doc(`companies/${companyId}/employees/${uid}`);
  const employeeSnap = await employeeRef.get();
  if (!employeeSnap.exists) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  await employeeRef.update({
    active: false,
    deactivatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await clearEmployeeClaims(uid);

  return NextResponse.json({ ok: true });
}
