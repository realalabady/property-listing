import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canEditCompanyListing } from "@/lib/api/company-listings";
import { adminDb } from "@/lib/firebase/admin";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import {
  LISTING_STATUSES,
  type ListingStatus,
} from "@/constants/listing-categories";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; listingId: string }>;
}

const VALID_STATUSES = new Set<string>(Object.values(LISTING_STATUSES));

function globalListingDocId(companyId: string, listingId: string): string {
  return `${companyId}_${listingId}`;
}

async function syncGlobalListing(
  companyId: string,
  listingId: string,
  listingData: Record<string, unknown>,
): Promise<void> {
  const db = adminDb();
  const globalRef = db.doc(
    `global_listings/${globalListingDocId(companyId, listingId)}`,
  );

  if (listingData.status !== "published") {
    await globalRef.delete().catch(() => undefined);
    return;
  }

  const companySnap = await db.doc(`companies/${companyId}`).get();
  const company = (companySnap.data() ?? {}) as Record<string, unknown>;
  const location = (listingData.location ?? {}) as Record<string, unknown>;

  await globalRef.set(
    {
      sourceListingId: listingId,
      companyId,
      companyName: typeof company.name === "string" ? company.name : "Company",
      companySlug: typeof company.slug === "string" ? company.slug : "",
      companyLogo: typeof company.logo === "string" ? company.logo : "",
      title:
        typeof listingData.title === "string"
          ? listingData.title
          : "Untitled property",
      titleAr:
        typeof listingData.titleAr === "string" ? listingData.titleAr : null,
      type: typeof listingData.type === "string" ? listingData.type : "sale",
      category:
        typeof listingData.category === "string"
          ? listingData.category
          : "apartment",
      price: typeof listingData.price === "number" ? listingData.price : 0,
      currency:
        typeof listingData.currency === "string" ? listingData.currency : "SAR",
      city: typeof location.city === "string" ? location.city : "",
      country: typeof location.country === "string" ? location.country : "",
      district: typeof location.district === "string" ? location.district : "",
      bedrooms:
        typeof listingData.bedrooms === "number" ? listingData.bedrooms : null,
      bathrooms:
        typeof listingData.bathrooms === "number"
          ? listingData.bathrooms
          : null,
      area: typeof listingData.area === "number" ? listingData.area : 0,
      areaUnit:
        typeof listingData.areaUnit === "string" ? listingData.areaUnit : "sqm",
      coverImage:
        typeof listingData.coverImage === "string"
          ? listingData.coverImage
          : "",
      status: "published",
      featured: Boolean(listingData.featured),
      createdAt: listingData.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { companyId, listingId } = await context.params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
    }

    const body = (await req.json()) as { status?: unknown };
    const status = body.status;

    if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Invalid status value." },
        { status: 400 },
      );
    }

    const db = adminDb();
    const ref = db.doc(`companies/${companyId}/listings/${listingId}`);
    const listingSnap = await ref.get();

    if (!listingSnap.exists) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    const listingData = listingSnap.data() as Record<string, unknown>;

    if (!canEditCompanyListing(user, companyId, listingData)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Publishing requires an extra permission
    if (
      status === LISTING_STATUSES.PUBLISHED &&
      !hasAnyPermission(user.permissions, [PERMISSIONS.PUBLISH_LISTING])
    ) {
      return NextResponse.json(
        { error: "You do not have permission to publish listings." },
        { status: 403 },
      );
    }

    const update: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (status === LISTING_STATUSES.PUBLISHED) {
      update.publishedAt = FieldValue.serverTimestamp();
    }

    await ref.update(update);

    // Sync to global_listings (what Cloud Functions does in production)
    const updatedData = { ...listingData, ...update, status };
    await syncGlobalListing(companyId, listingId, updatedData);

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[PATCH /status]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
