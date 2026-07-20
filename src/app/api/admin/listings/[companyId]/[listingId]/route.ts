import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; listingId: string }>;
}

/**
 * DELETE /api/admin/listings/{companyId}/{listingId} — super-admin only.
 * Soft delete: flags the listing as deleted (recoverable) and immediately
 * removes its public `global_listings` mirror so it disappears from the
 * marketplace at once. The Cloud Function also treats `isDeleted` as
 * unpublished, so the mirror can't be re-created by a later write.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { companyId, listingId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const listingRef = adminDb().doc(
    `companies/${companyId}/listings/${listingId}`,
  );
  const snap = await listingRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  await listingRef.update({
    isDeleted: true,
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: user.uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Drop the public marketplace mirror right away (doc id is companyId_listingId).
  await adminDb()
    .doc(`global_listings/${companyId}_${listingId}`)
    .delete()
    .catch(() => undefined);

  return NextResponse.json({ ok: true, deleted: "soft" });
}
