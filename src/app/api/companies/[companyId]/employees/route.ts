import { randomBytes } from "crypto";
import { type UserRecord } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { applyRoleClaims } from "@/lib/auth/claims";
import { getSessionUser } from "@/lib/auth/session";
import {
  canManageCompanyEmployees,
  canViewCompanyEmployees,
  emptyEmployeeKpi,
  fallbackName,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  normalizeOptionalText,
  parseAssignableEmployeeRole,
  parsePermissionOverrides,
  serializeDate,
} from "@/lib/api/company-employees";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

interface CreateEmployeeBody {
  uid?: string;
  email?: string;
  name?: string;
  role?: string;
  permissions?: unknown;
  phone?: string;
  department?: string;
  title?: string;
  active?: boolean;
  temporaryPassword?: string;
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function prettifyEmailToName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart
    .replace(/[._+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Employee";

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveEmployeeName(data: Record<string, unknown>): string {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (name && !isEmailLike(name)) return name;

  const displayName =
    typeof data.displayName === "string" ? data.displayName.trim() : "";
  if (displayName && !isEmailLike(displayName)) return displayName;

  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (email) return prettifyEmailToName(email);

  if (name) return name;
  if (displayName) return displayName;

  return "Employee";
}

function mapEmployeeDoc(
  id: string,
  data: Record<string, unknown>,
  companyId: string,
) {
  const displayName =
    typeof data.displayName === "string" ? data.displayName : null;

  return {
    id,
    companyId,
    email: typeof data.email === "string" ? data.email : "",
    name: resolveEmployeeName(data),
    displayName,
    phone: typeof data.phone === "string" ? data.phone : null,
    department: typeof data.department === "string" ? data.department : null,
    title: typeof data.title === "string" ? data.title : null,
    role: typeof data.role === "string" ? data.role : ROLES.VIEWER,
    permissions: Array.isArray(data.permissions)
      ? data.permissions.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    permissionGroupIds: Array.isArray(data.permissionGroupIds)
      ? data.permissionGroupIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    active: data.active !== false,
    invitedBy: typeof data.invitedBy === "string" ? data.invitedBy : null,
    invitedAt: serializeDate(data.invitedAt),
    joinedAt: serializeDate(data.joinedAt),
    lastActiveAt: serializeDate(data.lastActiveAt),
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
  };
}

async function clearEmployeeClaims(uid: string) {
  await adminAuth().setCustomUserClaims(uid, {
    role: null,
    companyId: null,
    permissions: [],
  });
  await adminAuth().revokeRefreshTokens(uid);
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canViewCompanyEmployees(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const snap = await adminDb()
    .collection(`companies/${companyId}/employees`)
    .orderBy("name", "asc")
    .limit(300)
    .get();

  const employees = snap.docs.map((doc) =>
    mapEmployeeDoc(doc.id, doc.data() as Record<string, unknown>, companyId),
  );

  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canManageCompanyEmployees(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as CreateEmployeeBody;

  const role = parseAssignableEmployeeRole(body.role);
  if (!role) {
    return NextResponse.json(
      { error: "Invalid role. Please choose an assignable employee role." },
      { status: 400 },
    );
  }

  const permissions = parsePermissionOverrides(body.permissions, {
    allowEmpty: true,
    allowPlatformPermissions: user.role === ROLES.SUPER_ADMIN,
  });
  if (!permissions) {
    return NextResponse.json(
      { error: "Invalid permissions list." },
      { status: 400 },
    );
  }

  const uid = typeof body.uid === "string" ? body.uid.trim() : "";
  const providedEmail = normalizeEmail(body.email);
  if (!uid && !providedEmail) {
    return NextResponse.json(
      { error: "Either uid or email is required." },
      { status: 400 },
    );
  }

  let authUser: UserRecord | null = null;
  let authUserCreated = false;
  let temporaryPassword: string | null = null;

  if (uid) {
    try {
      authUser = await adminAuth().getUser(uid);
    } catch {
      return NextResponse.json(
        { error: "Firebase auth user was not found for the provided uid." },
        { status: 404 },
      );
    }
  } else {
    if (!isValidEmail(providedEmail)) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 },
      );
    }

    try {
      authUser = await adminAuth().getUserByEmail(providedEmail);
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";

      if (code !== "auth/user-not-found") {
        throw error;
      }

      const requestedPassword =
        typeof body.temporaryPassword === "string"
          ? body.temporaryPassword.trim()
          : "";

      temporaryPassword =
        requestedPassword.length >= 8
          ? requestedPassword
          : randomBytes(12).toString("base64url");

      authUser = await adminAuth().createUser({
        email: providedEmail,
        displayName: normalizeName(body.name) || undefined,
        password: temporaryPassword,
        disabled: false,
      });
      authUserCreated = true;
    }
  }

  if (!authUser?.email) {
    return NextResponse.json(
      {
        error:
          "Employee auth user does not have an email. Please update the auth account first.",
      },
      { status: 400 },
    );
  }

  const email = normalizeEmail(authUser.email);
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Resolved email is invalid." },
      { status: 400 },
    );
  }

  const employeeRef = adminDb().doc(
    `companies/${companyId}/employees/${authUser.uid}`,
  );
  const employeeSnap = await employeeRef.get();
  if (employeeSnap.exists && employeeSnap.get("active") !== false) {
    return NextResponse.json(
      { error: "Employee already exists and is active." },
      { status: 409 },
    );
  }

  const name =
    normalizeName(body.name) ||
    normalizeName(authUser.displayName) ||
    fallbackName(email);
  const phone = normalizeOptionalText(body.phone);
  const department = normalizeOptionalText(body.department);
  const title = normalizeOptionalText(body.title);
  const active = body.active !== false;

  const payload: Record<string, unknown> = {
    companyId,
    email,
    name,
    role,
    permissions,
    active,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (phone) payload.phone = phone;
  if (department) payload.department = department;
  if (title) payload.title = title;

  if (!employeeSnap.exists) {
    payload.kpi = emptyEmployeeKpi();
    payload.createdAt = FieldValue.serverTimestamp();
    payload.joinedAt = FieldValue.serverTimestamp();
    payload.invitedBy = user.uid;
    payload.invitedAt = FieldValue.serverTimestamp();
  } else {
    if (!employeeSnap.get("createdAt")) {
      payload.createdAt = FieldValue.serverTimestamp();
    }
    if (!employeeSnap.get("kpi")) {
      payload.kpi = emptyEmployeeKpi();
    }
    if (employeeSnap.get("active") === false && active) {
      payload.joinedAt = FieldValue.serverTimestamp();
    }
  }

  await employeeRef.set(payload, { merge: true });

  if (active) {
    await applyRoleClaims(authUser.uid, role, companyId, permissions);
  } else {
    await clearEmployeeClaims(authUser.uid);
  }

  let passwordResetLink: string | null = null;
  if (authUserCreated) {
    try {
      passwordResetLink = await adminAuth().generatePasswordResetLink(email);
    } catch {
      passwordResetLink = null;
    }
  }

  return NextResponse.json(
    {
      ok: true,
      employee: {
        id: authUser.uid,
        companyId,
        email,
        name,
        role,
        permissions,
        active,
        phone,
        department,
        title,
        createdAt: null,
        updatedAt: null,
      },
      authUserCreated,
      ...(temporaryPassword ? { temporaryPassword } : {}),
      ...(passwordResetLink ? { passwordResetLink } : {}),
    },
    { status: 201 },
  );
}
