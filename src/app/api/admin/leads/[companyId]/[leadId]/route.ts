import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; leadId: string }>;
}

/**
 * DELETE /api/admin/leads/{companyId}/{leadId} — super-admin only.
 * Soft delete: flags the lead as deleted so it drops out of the company and
 * admin lead views, while the record stays recoverable in Firestore.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { companyId, leadId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const leadRef = adminDb().doc(`companies/${companyId}/leads/${leadId}`);
  const snap = await leadRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  await leadRef.update({
    isDeleted: true,
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: user.uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, deleted: "soft" });
}
