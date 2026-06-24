import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canManageCompanyEmployees } from "@/lib/api/company-employees";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; invitationId: string }>;
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { companyId, invitationId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canManageCompanyEmployees(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const status = invitationSnap.get("status");
  if (status === "accepted") {
    return NextResponse.json(
      { error: "Accepted invitations cannot be revoked." },
      { status: 400 },
    );
  }

  await invitationRef.update({
    status: "revoked",
    revokedBy: user.uid,
    revokedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
