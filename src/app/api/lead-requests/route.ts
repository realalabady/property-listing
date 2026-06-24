import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canViewAssignedLeads, serializeDate } from "@/lib/api/company-leads";
import { validateLeadRequestBody } from "@/lib/api/lead-requests";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * POST — public, unauthenticated. A customer broadcasts a property request from
 * the landing page; it lands in the global `lead_requests` collection visible
 * to every company. A hidden honeypot field silently drops bots.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof body.company === "string" && body.company.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const result = validateLeadRequestBody(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const ref = adminDb().collection("lead_requests").doc();
  await ref.set({
    ...result.value,
    source: "landing_request",
    status: "new",
    claimedBy: {},
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
}

/**
 * GET — authenticated. Returns the broadcast feed for the current company, each
 * row annotated with whether THIS company has already moved it to its leads.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const companyId = user.companyId;
  if (typeof companyId !== "string" || !canViewAssignedLeads(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const snap = await adminDb()
    .collection("lead_requests")
    .orderBy("createdAt", "desc")
    .limit(120)
    .get();

  const requests = snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const claimedBy = (data.claimedBy ?? {}) as Record<
      string,
      { leadId?: unknown }
    >;
    const claim = claimedBy[companyId];
    return {
      id: doc.id,
      name: typeof data.name === "string" ? data.name : "",
      phone: typeof data.phone === "string" ? data.phone : "",
      email: typeof data.email === "string" ? data.email : null,
      message: typeof data.message === "string" ? data.message : null,
      preferredContactMethod:
        typeof data.preferredContactMethod === "string"
          ? data.preferredContactMethod
          : null,
      requirement:
        typeof data.requirement === "object" && data.requirement !== null
          ? (data.requirement as Record<string, unknown>)
          : null,
      claimed: Boolean(claim),
      claimedLeadId:
        claim && typeof claim.leadId === "string" ? claim.leadId : null,
      createdAt: serializeDate(data.createdAt),
    };
  });

  return NextResponse.json({ requests });
}
