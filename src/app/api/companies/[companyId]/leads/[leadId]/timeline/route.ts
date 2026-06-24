import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessLeadDocument, serializeDate } from "@/lib/api/company-leads";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; leadId: string }>;
}

function mapEvent(id: string, data: Record<string, unknown>) {
  return {
    id,
    type: typeof data.type === "string" ? data.type : "event",
    actorId: typeof data.actorId === "string" ? data.actorId : null,
    actorName: typeof data.actorName === "string" ? data.actorName : "System",
    message: typeof data.message === "string" ? data.message : "Activity",
    metadata:
      typeof data.metadata === "object" && data.metadata !== null
        ? data.metadata
        : null,
    createdAt: serializeDate(data.createdAt),
  };
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { companyId, leadId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const leadRef = adminDb().doc(`companies/${companyId}/leads/${leadId}`);
  const leadSnap = await leadRef.get();

  if (!leadSnap.exists) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const leadData = leadSnap.data() as Record<string, unknown>;
  if (!canAccessLeadDocument(user, companyId, leadData)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const activitySnap = await leadRef
    .collection("activity")
    .orderBy("createdAt", "desc")
    .limit(300)
    .get();

  const events = activitySnap.docs.map((doc) =>
    mapEvent(doc.id, doc.data() as Record<string, unknown>),
  );

  if (events.length === 0) {
    events.push({
      id: "lead_created",
      type: "lead_created",
      actorId: null,
      actorName: "System",
      message: "Lead was created",
      metadata: null,
      createdAt: serializeDate(leadData.createdAt),
    });
  }

  return NextResponse.json({ events });
}
