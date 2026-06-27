import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { ROLES } from "@/constants/roles";
import {
  normalizeSearchCriteria,
  searchDocId,
} from "@/lib/api/customer-searches";

export const runtime = "nodejs";

/**
 * POST /api/customer/searches — authenticated customers only.
 * Logs a committed marketplace search as a contactable lead signal, with the
 * customer's profile contact info denormalised onto the record. Repeat
 * identical searches upsert one doc (keyed by a criteria hash), bumping
 * `lastSearchedAt` and a search counter instead of creating duplicates.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (user.role !== ROLES.CUSTOMER) {
    // Only marketplace customers generate matched-lead signals.
    return NextResponse.json({ ok: true, skipped: true });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const criteria = normalizeSearchCriteria(body.criteria ?? body);
  if (!criteria) {
    // Empty search (no usable filters) — nothing worth logging.
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Pull canonical contact details from the customer's profile.
  const profileSnap = await adminDb().doc(`customers/${user.uid}`).get();
  const profile = (profileSnap.data() ?? {}) as Record<string, unknown>;

  const ref = adminDb()
    .collection("customer_searches")
    .doc(searchDocId(user.uid, criteria));
  const now = FieldValue.serverTimestamp();
  const exists = (await ref.get()).exists;

  await ref.set(
    {
      customerId: user.uid,
      customerName: typeof profile.name === "string" ? profile.name : "",
      customerPhone: typeof profile.phone === "string" ? profile.phone : "",
      customerEmail:
        typeof profile.email === "string" ? profile.email : user.email ?? "",
      preferredContactMethod:
        typeof profile.preferredContactMethod === "string"
          ? profile.preferredContactMethod
          : null,
      contactConsent: profile.contactConsent === true,
      criteria,
      searchCount: FieldValue.increment(1),
      lastSearchedAt: now,
      updatedAt: now,
      ...(exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, id: ref.id });
}
