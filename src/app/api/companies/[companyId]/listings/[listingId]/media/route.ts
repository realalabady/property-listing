import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  canEditCompanyListing,
  normalizeListingMediaItem,
  parseListingMediaArray,
  resolveListingCover,
  type ListingMediaInput,
} from "@/lib/api/company-listings";
import { adminDb, adminStorage } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; listingId: string }>;
}

interface ReplaceMediaBody {
  media?: unknown;
  deleteMissingFromStorage?: boolean;
}

interface DeleteMediaBody {
  path?: string;
  url?: string;
  deleteFromStorage?: boolean;
}

interface UpsertMediaBody extends ListingMediaInput {
  deleteFromStorage?: boolean;
}

function listingRef(companyId: string, listingId: string) {
  return adminDb().doc(`companies/${companyId}/listings/${listingId}`);
}

function parseExistingMedia(
  listingData: Record<string, unknown>,
  companyId: string,
  listingId: string,
) {
  const parsed = parseListingMediaArray(
    listingData.media,
    companyId,
    listingId,
  );
  return parsed ?? [];
}

async function removeStoragePaths(paths: string[]) {
  if (paths.length === 0) return;

  const bucket = adminStorage().bucket();
  await Promise.all(
    paths.map((path) =>
      bucket
        .file(path)
        .delete({ ignoreNotFound: true })
        .catch(() => undefined),
    ),
  );
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { companyId, listingId } = await context.params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
    }

    const ref = listingRef(companyId, listingId);
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

    const media = parseExistingMedia(listingData, companyId, listingId);
    const { media: normalizedMedia, coverImage } = resolveListingCover(media);

    return NextResponse.json({
      media: normalizedMedia,
      coverImage,
    });
  } catch (err) {
    console.error("[GET /media]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { companyId, listingId } = await context.params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
    }

    const ref = listingRef(companyId, listingId);
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

    const body = (await req.json()) as UpsertMediaBody;
    const currentMedia = parseExistingMedia(listingData, companyId, listingId);

    const nextMediaItem = normalizeListingMediaItem(
      body,
      currentMedia.length,
      companyId,
      listingId,
    );
    if (!nextMediaItem) {
      return NextResponse.json(
        { error: "Invalid media payload." },
        { status: 400 },
      );
    }

    if (currentMedia.some((item) => item.path === nextMediaItem.path)) {
      return NextResponse.json(
        { error: "Media path already exists on this listing." },
        { status: 409 },
      );
    }

    const candidateMedia = [
      ...currentMedia.map((item) => ({
        ...item,
        isCover: nextMediaItem.isCover ? false : item.isCover,
      })),
      nextMediaItem,
    ];
    const { media, coverImage } = resolveListingCover(candidateMedia);

    await ref.update({
      media,
      coverImage,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const added =
      media.find((item) => item.path === nextMediaItem.path) ?? nextMediaItem;

    return NextResponse.json(
      {
        ok: true,
        media,
        coverImage,
        added,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /media]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { companyId, listingId } = await context.params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
    }

    const ref = listingRef(companyId, listingId);
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

    const body = (await req.json()) as ReplaceMediaBody;
    const media = parseListingMediaArray(body.media, companyId, listingId);
    if (!media) {
      return NextResponse.json(
        { error: "media must be a valid array of listing media objects." },
        { status: 400 },
      );
    }

    const previousMedia = parseExistingMedia(listingData, companyId, listingId);
    const previousPaths = new Set(previousMedia.map((item) => item.path));

    const { media: normalizedMedia, coverImage } = resolveListingCover(media);
    const nextPaths = new Set(normalizedMedia.map((item) => item.path));

    await ref.update({
      media: normalizedMedia,
      coverImage,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (body.deleteMissingFromStorage) {
      const removedPaths = Array.from(previousPaths).filter(
        (path) => !nextPaths.has(path),
      );
      await removeStoragePaths(removedPaths);
    }

    return NextResponse.json({
      ok: true,
      media: normalizedMedia,
      coverImage,
    });
  } catch (err) {
    console.error("[PUT /media]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { companyId, listingId } = await context.params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
    }

    const ref = listingRef(companyId, listingId);
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

    const body = (await req.json()) as DeleteMediaBody;
    const path = typeof body.path === "string" ? body.path.trim() : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";

    if (!path && !url) {
      return NextResponse.json(
        { error: "Provide either media path or url to remove." },
        { status: 400 },
      );
    }

    const currentMedia = parseExistingMedia(listingData, companyId, listingId);
    const nextMedia = currentMedia.filter((item) => {
      if (path && item.path === path) return false;
      if (url && item.url === url) return false;
      return true;
    });

    if (nextMedia.length === currentMedia.length) {
      return NextResponse.json(
        { error: "Media item not found." },
        { status: 404 },
      );
    }

    const removedPaths = currentMedia
      .filter((item) => !nextMedia.some((next) => next.path === item.path))
      .map((item) => item.path);

    const { media, coverImage } = resolveListingCover(nextMedia);

    await ref.update({
      media,
      coverImage,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (body.deleteFromStorage) {
      await removeStoragePaths(removedPaths);
    }

    return NextResponse.json({
      ok: true,
      media,
      coverImage,
      removedPaths,
    });
  } catch (err) {
    console.error("[DELETE /media]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
