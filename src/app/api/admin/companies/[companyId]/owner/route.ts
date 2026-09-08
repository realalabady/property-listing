import { randomBytes } from "crypto";
import { type UserRecord } from "firebase-admin/auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLE_PERMISSIONS } from "@/constants/permissions";
import { ROLE_LABELS, ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { applyRoleClaims } from "@/lib/auth/claims";
import { buildPasswordResetUrl } from "@/lib/auth/password-reset-link";
import { getSessionUser } from "@/lib/auth/session";
import {
  emptyEmployeeKpi,
  fallbackName,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  normalizeOptionalText,
} from "@/lib/api/company-employees";
import { sendOwnerWelcomeEmail } from "@/lib/email/accounts";
import { sendInvitationEmail } from "@/lib/email/invitations";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { resolveAppBaseUrl } from "@/lib/url/app-base-url";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

interface DirectOwnerPayload {
  mode: "direct";
  email?: string;
  name?: string;
  phone?: string;
  temporaryPassword?: string;
  issueResetLink?: boolean;
}

interface InviteOwnerPayload {
  mode: "invite";
  email?: string;
  name?: string;
  expiresInDays?: number;
}

interface ResetOwnerPayload {
  mode: "reset_link";
  email?: string;
}

type OwnerPayload = DirectOwnerPayload | InviteOwnerPayload | ResetOwnerPayload;

/** Display name for the company in emails, with an Arabic fallback. */
function companyName(data: Record<string, unknown>): string {
  return typeof data.name === "string" && data.name.trim()
    ? data.name
    : "شركتك";
}

async function getActiveOwnerDocs(companyId: string) {
  return adminDb()
    .collection(`companies/${companyId}/employees`)
    .where("role", "==", ROLES.COMPANY_OWNER)
    .where("active", "==", true)
    .get();
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as OwnerPayload;

  const companyRef = adminDb().doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const companyData = companySnap.data() as Record<string, unknown>;
  const isDeleted =
    companyData.isDeleted === true || Boolean(companyData.deletedAt);
  if (isDeleted) {
    return NextResponse.json(
      { error: "Cannot modify owner of a deleted company." },
      { status: 409 },
    );
  }

  const ownerPermissions = ROLE_PERMISSIONS[ROLES.COMPANY_OWNER];

  if (body.mode === "direct") {
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid owner email is required." },
        { status: 400 },
      );
    }

    const ownerName =
      normalizeName(body.name) || fallbackName(email) || "Company Owner";
    const ownerPhone = normalizeOptionalText(body.phone);

    let authUser: UserRecord;
    let authUserCreated = false;
    let temporaryPassword: string | null = null;

    try {
      authUser = await adminAuth().getUserByEmail(email);
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
        email,
        displayName: ownerName,
        password: temporaryPassword,
      });
      authUserCreated = true;
    }

    const activeOwnersSnap = await getActiveOwnerDocs(companyId);
    const hasAnotherOwner = activeOwnersSnap.docs.some(
      (doc) => doc.id !== authUser.uid,
    );

    if (hasAnotherOwner) {
      return NextResponse.json(
        {
          error:
            "This company already has an active owner. Deactivate the current owner before assigning a new one.",
        },
        { status: 409 },
      );
    }

    const employeeRef = adminDb().doc(
      `companies/${companyId}/employees/${authUser.uid}`,
    );
    const employeeSnap = await employeeRef.get();

    const employeePayload: Record<string, unknown> = {
      companyId,
      email,
      name: ownerName,
      role: ROLES.COMPANY_OWNER,
      permissions: ownerPermissions,
      title: "Owner",
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (ownerPhone) {
      employeePayload.phone = ownerPhone;
    }
    // Fresh auth accounts get a generated temp password → remind them to reset.
    if (authUserCreated) {
      employeePayload.passwordResetRequired = true;
    }

    if (!employeeSnap.exists) {
      employeePayload.createdAt = FieldValue.serverTimestamp();
      employeePayload.joinedAt = FieldValue.serverTimestamp();
      employeePayload.invitedBy = user.uid;
      employeePayload.invitedAt = FieldValue.serverTimestamp();
      employeePayload.kpi = emptyEmployeeKpi();
    }

    await employeeRef.set(employeePayload, { merge: true });

    await companyRef.update({
      ownerId: authUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await applyRoleClaims(
      authUser.uid,
      ROLES.COMPANY_OWNER,
      companyId,
      ownerPermissions,
    );

    const appBaseUrl = resolveAppBaseUrl(req);

    let passwordResetLink: string | null = null;
    if (authUserCreated || body.issueResetLink === true) {
      passwordResetLink = await buildPasswordResetUrl(email, appBaseUrl);
    }

    // Previously the link was only returned for the admin to copy by hand.
    // Mail it too — the temporary password stays out of the email.
    const ownerEmail = await sendOwnerWelcomeEmail({
      to: email,
      name: ownerName,
      companyName: companyName(companyData),
      resetUrl: passwordResetLink,
      loginUrl: `${appBaseUrl}${ROUTES.LOGIN}`,
    });

    return NextResponse.json({
      ok: true,
      mode: body.mode,
      owner: {
        uid: authUser.uid,
        email,
        name: ownerName,
      },
      authUserCreated,
      ownerEmailSent: ownerEmail.sent,
      ownerEmailSkipped: ownerEmail.skipped,
      ...(ownerEmail.reason ? { ownerEmailReason: ownerEmail.reason } : {}),
      ...(temporaryPassword ? { temporaryPassword } : {}),
      ...(passwordResetLink ? { passwordResetLink } : {}),
    });
  }

  if (body.mode === "invite") {
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid owner email is required." },
        { status: 400 },
      );
    }

    const activeOwnersSnap = await getActiveOwnerDocs(companyId);
    if (!activeOwnersSnap.empty) {
      const hasDifferentOwner = activeOwnersSnap.docs.some(
        (doc) => normalizeEmail(doc.get("email")) !== email,
      );

      if (hasDifferentOwner) {
        return NextResponse.json(
          {
            error:
              "This company already has an active owner. Deactivate the current owner before inviting another owner.",
          },
          { status: 409 },
        );
      }
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
        if (doc.get("status") === "pending") {
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
      role: ROLES.COMPANY_OWNER,
      permissions: ownerPermissions,
      invitedBy: user.uid,
      status: "pending",
      token,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const appBaseUrl = resolveAppBaseUrl(req);

    let passwordResetLink: string | null = null;
    try {
      const ownerDisplayName =
        normalizeName(body.name) || fallbackName(email) || "Company Owner";

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
            displayName: ownerDisplayName,
          });
        }
      }

      passwordResetLink = await buildPasswordResetUrl(email, appBaseUrl);
    } catch {
      passwordResetLink = null;
    }

    const acceptApiUrl = `${appBaseUrl}/api/companies/${companyId}/invitations/${invitationRef.id}/accept?token=${encodeURIComponent(token)}`;
    const suggestedLoginUrl = `${appBaseUrl}/login?inviteCompany=${companyId}&inviteId=${invitationRef.id}&token=${encodeURIComponent(token)}`;
    const invitationEmail = await sendInvitationEmail({
      to: email,
      inviteeName: normalizeName(body.name),
      companyName:
        typeof companyData.name === "string"
          ? companyData.name
          : "Your company",
      roleLabel: ROLE_LABELS[ROLES.COMPANY_OWNER],
      invitedByEmail: user.email ?? null,
      suggestedLoginUrl,
      acceptApiUrl,
      passwordResetLink,
      expiresAtIso: expiresAt.toDate().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mode: body.mode,
      invitation: {
        id: invitationRef.id,
        email,
        expiresAt: expiresAt.toDate().toISOString(),
      },
      acceptApiUrl,
      suggestedLoginUrl,
      invitationEmailSent: invitationEmail.sent,
      invitationEmailSkipped: invitationEmail.skipped,
      invitationEmailReason: invitationEmail.reason ?? null,
      ...(passwordResetLink ? { passwordResetLink } : {}),
    });
  }

  if (body.mode === "reset_link") {
    const activeOwnersSnap = await getActiveOwnerDocs(companyId);
    const bodyEmail = normalizeEmail(body.email);

    const ownerEmail =
      bodyEmail || normalizeEmail(activeOwnersSnap.docs[0]?.get("email"));

    if (!isValidEmail(ownerEmail)) {
      return NextResponse.json(
        { error: "Owner email was not found. Provide a valid email." },
        { status: 400 },
      );
    }

    const appBaseUrl = resolveAppBaseUrl(req);
    const passwordResetLink = await buildPasswordResetUrl(
      ownerEmail,
      appBaseUrl,
    );

    // Mail the link as well as returning it, so the admin no longer has to
    // relay a reset URL through WhatsApp for it to reach the owner.
    const resetEmail = passwordResetLink
      ? await sendPasswordResetEmail({
          to: ownerEmail,
          name: normalizeName(activeOwnersSnap.docs[0]?.get("name")) || null,
          resetUrl: passwordResetLink,
        })
      : { sent: false, skipped: true, reason: "RESET_LINK_UNAVAILABLE" };

    return NextResponse.json({
      ok: true,
      mode: body.mode,
      email: ownerEmail,
      resetEmailSent: resetEmail.sent,
      resetEmailSkipped: resetEmail.skipped,
      ...(resetEmail.reason ? { resetEmailReason: resetEmail.reason } : {}),
      passwordResetLink,
    });
  }

  return NextResponse.json(
    { error: "Invalid owner action mode." },
    { status: 400 },
  );
}
