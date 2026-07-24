import "server-only";
import { NextResponse } from "next/server";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { canEditCompanyListing } from "@/lib/api/company-listings";
import { assertActiveMember } from "@/lib/api/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { LISTING_TYPES } from "@/constants/listing-categories";

/**
 * Shared guard for every auction/bid write. Auctions only exist on FOR-SALE
 * listings, and only members with `manage_bids` may touch them. Returns either
 * a ready-to-send error response or the loaded listing + resolved actor name.
 */
export type AuctionGuardResult =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      user: SessionUser;
      listingData: Record<string, unknown>;
      listingRef: DocumentReference;
      actorName: string;
    };

export async function guardAuctionWrite(
  companyId: string,
  listingId: string,
): Promise<AuctionGuardResult> {
  const err = (error: string, status: number): AuctionGuardResult => ({
    ok: false,
    response: NextResponse.json({ error }, { status }),
  });

  const user = await getSessionUser();
  if (!user) return err("Unauthenticated.", 401);

  const db = adminDb();
  const listingRef = db.doc(`companies/${companyId}/listings/${listingId}`);
  const listingSnap = await listingRef.get();
  if (!listingSnap.exists) return err("Listing not found.", 404);

  const listingData = listingSnap.data() as Record<string, unknown>;

  // Managing the auction is allowed for members holding `manage_bids` OR
  // anyone who can already edit this listing (owner/creator/editors). The
  // edit path is the "quick unblock" so existing staff can run auctions
  // before the new permission propagates into their token claims.
  const canManage =
    hasAnyPermission(user.permissions, [PERMISSIONS.MANAGE_BIDS]) ||
    canEditCompanyListing(user, companyId, listingData);
  if (!canManage) {
    return err("ليس لديك صلاحية إدارة المزايدة.", 403);
  }

  const membership = await assertActiveMember(user, companyId);
  if (!membership.ok) return err(membership.error, membership.status);

  if (listingData.type !== LISTING_TYPES.SALE) {
    return err("المزايدة متاحة لعروض البيع فقط.", 400);
  }

  const actorName = await resolveEmployeeName(companyId, user.uid, user.email);

  return { ok: true, user, listingData, listingRef, actorName };
}

/** Best-effort display name for the acting employee (audit trail). */
export async function resolveEmployeeName(
  companyId: string,
  uid: string,
  email: string | undefined,
): Promise<string> {
  try {
    const snap = await adminDb()
      .doc(`companies/${companyId}/employees/${uid}`)
      .get();
    const name = snap.get("name");
    if (typeof name === "string" && name.trim()) return name.trim();
  } catch {
    // fall through to email
  }
  if (typeof email === "string" && email) return email.split("@")[0]!;
  return "موظف";
}

/** Parse a strictly-positive integer amount from untrusted input. */
export function parsePositiveAmount(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}
