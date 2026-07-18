import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  canEditCompanyListing,
  resolveListingCover,
  parseListingMediaArray,
} from "@/lib/api/company-listings";
import { assertActiveMember } from "@/lib/api/guards";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; listingId: string }>;
}

interface SetCoverBody {
  path?: string;
  url?: string;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { companyId, listingId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const listingRef = adminDb().doc(
    `companies/${companyId}/listings/${listingId}`,
  );
  const listingSnap = await listingRef.get();

  if (!listingSnap.exists) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const listingData = listingSnap.data() as Record<string, unknown>;
  if (!canEditCompanyListing(user, companyId, listingData)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const membership = await assertActiveMember(user, companyId);
  if (!membership.ok) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status },
    );
  }

  const body = (await req.json()) as SetCoverBody;
  const path = typeof body.path === "string" ? body.path.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!path && !url) {
    return NextResponse.json(
      { error: "Provide either media path or url to set as cover." },
      { status: 400 },
    );
  }

  const media =
    parseListingMediaArray(listingData.media, companyId, listingId) ?? [];
  if (media.length === 0) {
    return NextResponse.json(
      { error: "Listing has no media items to set as cover." },
      { status: 400 },
    );
  }

  const target = media.find(
    (item) => (path && item.path === path) || (url && item.url === url),
  );
  if (!target) {
    return NextResponse.json(
      { error: "Target media item was not found." },
      { status: 404 },
    );
  }
  // The cover renders inside <img> on cards/marketplace; a video can't be one.
  if (target.type === "video") {
    return NextResponse.json(
      { error: "لا يمكن اختيار مقطع فيديو كصورة غلاف. اختر صورة." },
      { status: 400 },
    );
  }

  const candidate = media.map((item) => ({
    ...item,
    isCover: Boolean((path && item.path === path) || (url && item.url === url)),
  }));

  const { media: normalizedMedia, coverImage } = resolveListingCover(candidate);

  await listingRef.update({
    media: normalizedMedia,
    coverImage,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    coverImage,
    media: normalizedMedia,
  });
}
