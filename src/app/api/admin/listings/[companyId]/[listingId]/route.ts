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
 * Permanently removes a listing in ANY company. The `syncGlobalListing` Cloud
 * Function fires on the delete and (a) removes the mirrored `global_listings`
 * doc and (b) recomputes the company KPI, so no extra cleanup is needed here.
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

  await listingRef.delete();

  return NextResponse.json({ ok: true, deleted: listingId });
}
