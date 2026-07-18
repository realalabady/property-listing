import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import {
  LEAD_PRIORITY_LABELS,
  parseLeadPriority,
} from "@/constants/listing-categories";
import { getSessionUser } from "@/lib/auth/session";
import {
  canActOnAnyLead,
  canViewAssignedLeads,
  getLeadsVisibility,
} from "@/lib/api/company-leads";
import { assertActiveMember } from "@/lib/api/guards";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; leadId: string }>;
}

interface PriorityBody {
  priority?: unknown;
}

/**
 * Set or clear a lead's optional priority. Null clears it. Logged on the
 * activity timeline so priority escalations show up in the audit trail.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { companyId, leadId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (!canViewAssignedLeads(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const membership = await assertActiveMember(user, companyId);
  if (!membership.ok) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status },
    );
  }

  const body = (await req.json()) as PriorityBody;
  const priority = parseLeadPriority(body.priority);
  if (body.priority != null && priority === null) {
    return NextResponse.json(
      { error: "priority must be urgent, high, normal, or null." },
      { status: 400 },
    );
  }

  const leadRef = adminDb().doc(`companies/${companyId}/leads/${leadId}`);
  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const visibility = await getLeadsVisibility(companyId);
  const canMoveAny = canActOnAnyLead(user, companyId, visibility);
  if (!canMoveAny && leadSnap.get("assignedTo") !== user.uid) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const previous = parseLeadPriority(leadSnap.get("priority"));
  if (previous === priority) {
    return NextResponse.json({ ok: true, priority });
  }

  const actorSnap = await adminDb()
    .doc(`companies/${companyId}/employees/${user.uid}`)
    .get();
  const actorName =
    (actorSnap.exists && typeof actorSnap.get("name") === "string"
      ? String(actorSnap.get("name"))
      : user.email) || "Team member";

  const batch = adminDb().batch();
  batch.update(leadRef, {
    priority,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(leadRef.collection("activity").doc(), {
    companyId,
    leadId,
    type: "priority_changed",
    actorId: user.uid,
    actorName,
    message: priority
      ? `Priority set to ${LEAD_PRIORITY_LABELS[priority].en}`
      : "Priority cleared",
    metadata: { from: previous, to: priority },
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return NextResponse.json({ ok: true, priority });
}
