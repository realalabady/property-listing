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
 * Permanently removes a lead in ANY company along with its `activity`
 * subcollection. The `onLeadWriteRefreshKpi` Cloud Function recomputes the
 * company KPI on the delete.
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

  // Remove the nested activity trail first, then the lead itself.
  const activitySnap = await leadRef.collection("activity").limit(500).get();
  if (!activitySnap.empty) {
    const batch = adminDb().batch();
    for (const doc of activitySnap.docs) batch.delete(doc.ref);
    await batch.commit();
  }

  await leadRef.delete();

  return NextResponse.json({ ok: true, deleted: leadId });
}
