import { randomBytes } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLE_LABELS, ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getSessionUser } from "@/lib/auth/session";
import {
  canManageCompanyEmployees,
  canViewCompanyEmployees,
  fallbackName,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  parseAssignableEmployeeRole,
  parsePermissionOverrides,
  serializeDate,
} from "@/lib/api/company-employees";
import { sendInvitationEmail } from "@/lib/email/invitations";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { resolveAppBaseUrl } from "@/lib/url/app-base-url";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

interface CreateInvitationBody {
  email?: string;
  name?: string;
  role?: string;
  permissions?: unknown;
  expiresInDays?: number;
}

function mapInvitationDoc(
  id: string,
  data: Record<string, unknown>,
  companyId: string,
) {
  return {
    id,
    companyId,
    email: typeof data.email === "string" ? data.email : "",
    name: typeof data.name === "string" ? data.name : null,
    role: typeof data.role === "string" ? data.role : ROLES.VIEWER,
    permissions: Array.isArray(data.permissions)
      ? data.permissions.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    status: typeof data.status === "string" ? data.status : "pending",
    invitedBy: typeof data.invitedBy === "string" ? data.invitedBy : null,
    acceptedBy: typeof data.acceptedBy === "string" ? data.acceptedBy : null,
    expiresAt: serializeDate(data.expiresAt),
    acceptedAt: serializeDate(data.acceptedAt),
    revokedAt: serializeDate(data.revokedAt),
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
  };
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
    .collection(`companies/${companyId}/invitations`)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const invitations = snap.docs.map((doc) =>
    mapInvitationDoc(doc.id, doc.data() as Record<string, unknown>, companyId),
  );

  return NextResponse.json({ invitations });
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

  const body = (await req.json()) as CreateInvitationBody;

  const companySnap = await adminDb().doc(`companies/${companyId}`).get();
  const companyData = companySnap.exists
    ? (companySnap.data() as Record<string, unknown>)
    : ({} as Record<string, unknown>);

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }

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

  const employeesSnap = await adminDb()
    .collection(`companies/${companyId}/employees`)
    .where("email", "==", email)
    .where("active", "==", true)
    .limit(1)
    .get();

  if (!employeesSnap.empty) {
    return NextResponse.json(
      { error: "An active employee already exists with this email." },
      { status: 409 },
    );
  }

  const invitationsRef = adminDb().collection(
    `companies/${companyId}/invitations`,
  );
  const sameEmailSnap = await invitationsRef
    .where("emailLower", "==", email)
    .limit(25)
    .get();

  if (!sameEmailSnap.empty) {
    const batch = adminDb().batch();
    for (const doc of sameEmailSnap.docs) {
      const status = doc.get("status");
      if (status === "pending") {
        batch.update(doc.ref, {
          status: "revoked",
          revokedBy: user.uid,
          revokedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    await batch.commit();
  }

  const token = randomBytes(24).toString("base64url");
  const expiresInDaysRaw = Number(body.expiresInDays ?? 7);
  const expiresInDays = Number.isFinite(expiresInDaysRaw)
    ? Math.min(Math.max(Math.round(expiresInDaysRaw), 1), 30)
    : 7;
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
  );

  const invitationRef = invitationsRef.doc();
  await invitationRef.set({
    companyId,
    email,
    emailLower: email,
    name: normalizeName(body.name) || null,
    role,
    permissions,
    invitedBy: user.uid,
    status: "pending",
    token,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const appBaseUrl = resolveAppBaseUrl(req);

  const acceptApiUrl = `${appBaseUrl}/api/companies/${companyId}/invitations/${invitationRef.id}/accept?token=${encodeURIComponent(token)}`;
  const suggestedLoginUrl = `${appBaseUrl}${ROUTES.LOGIN}?inviteCompany=${companyId}&inviteId=${invitationRef.id}&token=${encodeURIComponent(token)}`;

  let passwordResetLink: string | null = null;
  try {
    const inviteeName =
      normalizeName(body.name) || fallbackName(email) || "Team Member";
    try {
      await adminAuth().getUserByEmail(email);
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";

      if (code === "auth/user-not-found") {
        await adminAuth().createUser({
          email,
          displayName: inviteeName,
        });
      }
    }

    passwordResetLink = await adminAuth().generatePasswordResetLink(email);
  } catch {
    passwordResetLink = null;
  }

  const invitationEmail = await sendInvitationEmail({
    to: email,
    inviteeName: normalizeName(body.name),
    companyName:
      typeof companyData.name === "string" ? companyData.name : "Your company",
    roleLabel: ROLE_LABELS[role],
    invitedByEmail: user.email ?? null,
    suggestedLoginUrl,
    acceptApiUrl,
    passwordResetLink,
    expiresAtIso: expiresAt.toDate().toISOString(),
  });

  return NextResponse.json(
    {
      ok: true,
      invitation: {
        id: invitationRef.id,
        companyId,
        email,
        role,
        permissions,
        status: "pending",
        expiresAt: expiresAt.toDate().toISOString(),
        createdAt: null,
        updatedAt: null,
      },
      acceptApiUrl,
      suggestedLoginUrl,
      invitationEmailSent: invitationEmail.sent,
      invitationEmailSkipped: invitationEmail.skipped,
      invitationEmailReason: invitationEmail.reason ?? null,
      ...(passwordResetLink ? { passwordResetLink } : {}),
    },
    { status: 201 },
  );
}
