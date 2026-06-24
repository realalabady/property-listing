import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { applyRoleClaims } from "@/lib/auth/claims";
import { getSessionUser } from "@/lib/auth/session";
import {
  emptyEmployeeKpi,
  fallbackName,
  normalizeEmail,
  normalizeName,
  parsePermissionOverrides,
  parseAssignableEmployeeRole,
} from "@/lib/api/company-employees";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; invitationId: string }>;
}

interface AcceptInvitationBody {
  token?: string;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId, invitationId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json(
      { error: "Your account must include an email to accept an invitation." },
      { status: 400 },
    );
  }

  let body: AcceptInvitationBody = {};
  try {
    body = (await req.json()) as AcceptInvitationBody;
  } catch {
    body = {};
  }

  const token =
    (typeof body.token === "string" ? body.token.trim() : "") ||
    req.nextUrl.searchParams.get("token") ||
    "";

  if (!token) {
    return NextResponse.json(
      { error: "Invitation token is required." },
      { status: 400 },
    );
  }

  const invitationRef = adminDb().doc(
    `companies/${companyId}/invitations/${invitationId}`,
  );
  const invitationSnap = await invitationRef.get();

  if (!invitationSnap.exists) {
    return NextResponse.json(
      { error: "Invitation not found." },
      { status: 404 },
    );
  }

  const data = invitationSnap.data() as Record<string, unknown>;
  const status = typeof data.status === "string" ? data.status : "pending";
  if (status !== "pending") {
    return NextResponse.json(
      { error: "This invitation is no longer pending." },
      { status: 400 },
    );
  }

  if (typeof data.token !== "string" || data.token !== token) {
    return NextResponse.json(
      { error: "Invalid invitation token." },
      { status: 403 },
    );
  }

  const inviteEmail = normalizeEmail(data.email);
  const userEmail = normalizeEmail(user.email);
  if (!inviteEmail || inviteEmail !== userEmail) {
    return NextResponse.json(
      { error: "Invitation email does not match the authenticated user." },
      { status: 403 },
    );
  }

  const expiresAt = toDate(data.expiresAt);
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    await invitationRef.update({
      status: "expired",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json(
      { error: "This invitation has expired." },
      { status: 410 },
    );
  }

  const role = parseAssignableEmployeeRole(data.role, {
    allowOwnerRole: true,
  });
  if (!role) {
    return NextResponse.json(
      { error: "Invitation contains an invalid role." },
      { status: 400 },
    );
  }

  if (role === ROLES.COMPANY_OWNER) {
    const activeOwnersSnap = await adminDb()
      .collection(`companies/${companyId}/employees`)
      .where("role", "==", ROLES.COMPANY_OWNER)
      .where("active", "==", true)
      .limit(2)
      .get();

    const hasAnotherOwner = activeOwnersSnap.docs.some(
      (doc) => doc.id !== user.uid,
    );
    if (hasAnotherOwner) {
      return NextResponse.json(
        {
          error:
            "This company already has an active owner. Ask the platform administrator to change ownership first.",
        },
        { status: 409 },
      );
    }
  }

  const permissions = parsePermissionOverrides(data.permissions, {
    allowEmpty: true,
    allowPlatformPermissions: false,
  });
  if (!permissions) {
    return NextResponse.json(
      { error: "Invitation contains invalid permissions." },
      { status: 400 },
    );
  }

  const employeeRef = adminDb().doc(
    `companies/${companyId}/employees/${user.uid}`,
  );

  await adminDb().runTransaction(async (tx) => {
    const companyRef = adminDb().doc(`companies/${companyId}`);
    const employeeSnap = await tx.get(employeeRef);

    const employeeName =
      normalizeName(data.name) || fallbackName(userEmail) || "Employee";

    tx.set(
      employeeRef,
      {
        companyId,
        email: userEmail,
        name: employeeName,
        role,
        permissions,
        active: true,
        invitedBy: typeof data.invitedBy === "string" ? data.invitedBy : null,
        invitedAt: data.createdAt ?? FieldValue.serverTimestamp(),
        joinedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ...(employeeSnap.exists
          ? {}
          : {
              createdAt: FieldValue.serverTimestamp(),
              kpi: emptyEmployeeKpi(),
            }),
      },
      { merge: true },
    );

    tx.update(invitationRef, {
      status: "accepted",
      acceptedBy: user.uid,
      acceptedAt: FieldValue.serverTimestamp(),
      token: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (role === ROLES.COMPANY_OWNER) {
      tx.set(
        companyRef,
        {
          ownerId: user.uid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  await applyRoleClaims(user.uid, role, companyId, permissions);

  return NextResponse.json({
    ok: true,
    accepted: true,
    companyId,
    role,
    permissions,
    redirectTo: "/dashboard",
  });
}
