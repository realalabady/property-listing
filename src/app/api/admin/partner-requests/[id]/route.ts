import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { isPartnerRequestStatus } from "@/lib/api/partner-requests";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/partner-requests/{id} — super-admin only.
 * Moves an agency application through review (contacted / approved / rejected)
 * and optionally records the company created from it.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isPartnerRequestStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const ref = adminDb().doc(`partner_requests/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  await ref.update({
    status: body.status,
    ...(typeof body.companyId === "string" && body.companyId
      ? { companyId: body.companyId }
      : {}),
    reviewedBy: user.uid,
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
