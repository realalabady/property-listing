import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { LEAD_STATUSES } from "@/constants/listing-categories";
import { getSessionUser } from "@/lib/auth/session";
import { canManageCompanyLeads } from "@/lib/api/company-leads";
import { normalizeRequirement } from "@/lib/api/lead-requests";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST — authenticated. Moves a broadcast request into the current company's
 * own leads pipeline. Shared-claim model: any company can claim independently;
 * idempotent per company (re-claiming returns the already-created lead).
 */
export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const companyId = user.companyId;
  if (typeof companyId !== "string" || !canManageCompanyLeads(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const requestRef = adminDb().doc(`lead_requests/${id}`);

  // Resolve the actor's display name (outside the transaction — not invariant).
  const actorSnap = await adminDb()
    .doc(`companies/${companyId}/employees/${user.uid}`)
    .get();
  const actorName =
    (actorSnap.exists && typeof actorSnap.get("name") === "string"
      ? String(actorSnap.get("name"))
      : user.email) || "Team member";

  const leadRef = adminDb().collection(`companies/${companyId}/leads`).doc();
  const activityRef = leadRef.collection("activity").doc();

  try {
    const result = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(requestRef);
      if (!snap.exists) {
        return { error: "not_found" as const };
      }
      const data = snap.data() as Record<string, unknown>;
      const claimedBy = (data.claimedBy ?? {}) as Record<
        string,
        { leadId?: unknown }
      >;
      const existing = claimedBy[companyId];
      if (existing && typeof existing.leadId === "string") {
        return { leadId: existing.leadId, alreadyClaimed: true };
      }

      const requirement = normalizeRequirement(data.requirement);

      tx.set(leadRef, {
        companyId,
        name: typeof data.name === "string" ? data.name : "Unknown",
        phone: typeof data.phone === "string" ? data.phone : "",
        email: typeof data.email === "string" ? data.email : null,
        message: typeof data.message === "string" ? data.message : null,
        nationalId: null,
        preferredContactMethod:
          typeof data.preferredContactMethod === "string"
            ? data.preferredContactMethod
            : null,
        source: "landing_request",
        quality: "unrated",
        requirement,
        listingId: null,
        listingTitle: "طلب عقار من العميل",
        assignedTo: null,
        assignedToName: null,
        assignedAt: null,
        status: LEAD_STATUSES.NEW,
        firstResponseAt: null,
        responseTimeMinutes: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(activityRef, {
        companyId,
        leadId: leadRef.id,
        type: "lead_created",
        actorId: user.uid,
        actorName,
        message: "تم نقل العميل من الطلبات الواردة",
        metadata: { source: "landing_request", leadRequestId: id },
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(requestRef, {
        [`claimedBy.${companyId}`]: {
          leadId: leadRef.id,
          byName: actorName,
          claimedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { leadId: leadRef.id, alreadyClaimed: false };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: "Lead request not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json(
      { error: "تعذّر نقل الطلب. حاول مرة أخرى." },
      { status: 500 },
    );
  }
}
