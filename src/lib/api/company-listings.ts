import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import type { ListingMedia } from "@/types/listing";

export type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;

export interface ListingMediaInput {
  url?: unknown;
  path?: unknown;
  type?: unknown;
  width?: unknown;
  height?: unknown;
  order?: unknown;
  alt?: unknown;
  isCover?: unknown;
}

export function canEditCompanyListing(
  user: SessionUser,
  companyId: string,
  listingData: Record<string, unknown>,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  if (hasAnyPermission(user.permissions, [PERMISSIONS.EDIT_LISTING])) {
    return true;
  }

  if (!hasAnyPermission(user.permissions, [PERMISSIONS.EDIT_OWN_LISTING])) {
    return false;
  }

  const isOwner =
    typeof listingData.createdBy === "string" &&
    listingData.createdBy === user.uid;
  const isAssignee =
    typeof listingData.assignedEmployeeId === "string" &&
    listingData.assignedEmployeeId === user.uid;

  return isOwner || isAssignee;
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
}

function isValidMediaType(value: unknown): value is "image" | "video" {
  return value === "image" || value === "video";
}

function isAllowedListingMediaPath(
  path: string,
  companyId: string,
  listingId: string,
): boolean {
  return path.startsWith(`companies/${companyId}/listings/${listingId}/`);
}

export function normalizeListingMediaItem(
  value: ListingMediaInput,
  index: number,
  companyId: string,
  listingId: string,
): ListingMedia | null {
  const url = normalizeString(value.url);
  const path = normalizeString(value.path);

  if (!url || !path) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  if (!isAllowedListingMediaPath(path, companyId, listingId)) return null;
  if (!isValidMediaType(value.type)) return null;

  const alt = normalizeString(value.alt);
  const order =
    typeof value.order === "number" && Number.isFinite(value.order)
      ? value.order
      : index;
  const width = normalizeNumber(value.width);
  const height = normalizeNumber(value.height);

  return {
    url,
    path,
    type: value.type,
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
    order,
    ...(alt && { alt }),
    isCover: Boolean(value.isCover),
  };
}

export function parseListingMediaArray(
  value: unknown,
  companyId: string,
  listingId: string,
): ListingMedia[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > 60) return null;

  const media: ListingMedia[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (typeof item !== "object" || item === null) return null;

    const normalized = normalizeListingMediaItem(
      item as ListingMediaInput,
      index,
      companyId,
      listingId,
    );
    if (!normalized) return null;
    if (seen.has(normalized.path)) return null;

    seen.add(normalized.path);
    media.push(normalized);
  }

  return media;
}

export function resolveListingCover(media: ListingMedia[]): {
  media: ListingMedia[];
  coverImage: string | null;
} {
  if (media.length === 0) {
    return { media, coverImage: null };
  }

  const sorted = [...media].sort((a, b) => a.order - b.order);

  // The cover is a still thumbnail rendered inside <img> on listing cards and
  // the public marketplace mirror, so ONLY an image can be the cover. A video
  // marked isCover blanks those <img> tags out — the "uploaded video doesn't
  // show at all" bug. Videos still appear in the gallery; they just can't be
  // the thumbnail. A video-only listing has a null cover (cards show their
  // placeholder) rather than a broken image.
  const images = sorted.filter((item) => item.type === "image");
  const explicitCover = images.find((item) => item.isCover);
  const coverPath = explicitCover?.path ?? images[0]?.path ?? null;

  const normalizedMedia = sorted.map((item, index) => ({
    ...item,
    order: index,
    isCover: coverPath !== null && item.path === coverPath,
  }));

  const coverImage =
    coverPath === null
      ? null
      : (normalizedMedia.find((item) => item.path === coverPath)?.url ?? null);
  return { media: normalizedMedia, coverImage };
}
