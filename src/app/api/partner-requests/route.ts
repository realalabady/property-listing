import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { validatePartnerRequestBody } from "@/lib/api/partner-requests";
import {
  sendPartnerRequestAckEmail,
  sendPartnerRequestEmail,
} from "@/lib/email/partner-requests";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * POST — public, unauthenticated. An agency applies to join the platform from
 * /partner; the application lands in `partner_requests` where the super admin
 * reviews it and creates the company. A hidden honeypot silently drops bots.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "website" field.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const result = validatePartnerRequestBody(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // One pending application per CR number — a resubmission updates the existing
  // one instead of filling the admin queue with duplicates.
  const existing = await adminDb()
    .collection("partner_requests")
    .where(
      "commercialRegistrationNumber",
      "==",
      result.value.commercialRegistrationNumber,
    )
    .where("status", "==", "new")
    .limit(1)
    .get();

  const doc = existing.docs[0];
  if (doc) {
    await doc.ref.set(
      { ...result.value, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return NextResponse.json({ ok: true, id: doc.id }, { status: 201 });
  }

  const ref = adminDb().collection("partner_requests").doc();
  await ref.set({
    ...result.value,
    source: "landing_partner",
    status: "new",
    companyId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // The application is already saved — a failing mailbox must not lose it, so
  // a send failure is logged rather than surfaced to the applicant.
  const [email, ack] = await Promise.all([
    sendPartnerRequestEmail(result.value),
    // Auto-reply so the applicant knows the form went somewhere.
    sendPartnerRequestAckEmail(result.value),
  ]);
  if (!email.sent) {
    console.error(
      `[partner-requests] notification not sent for ${ref.id}: ${email.reason}`,
    );
  }
  if (!ack.sent) {
    console.error(
      `[partner-requests] acknowledgement not sent for ${ref.id}: ${ack.reason}`,
    );
  }

  return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
}
