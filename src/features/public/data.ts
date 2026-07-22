import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  coerceListingCategory,
  coerceListingType,
  type ListingCategory,
  type ListingType,
} from "@/constants/listing-categories";
import type { PublicListingUnit } from "@/types/listing";

export interface PublicCompanyTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface PublicCompany {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string;
  whatsapp: string;
  phone: string;
  email: string;
  theme: PublicCompanyTheme;
}

export interface PublicMedia {
  url: string;
  type: "image" | "video";
  order: number;
  isCover: boolean;
}

export interface PublicListing {
  id: string;
  /** Real listing id under companies/{companyId}/listings. On the global mirror
   *  the doc id is `${companyId}_${listingId}`, so this holds the actual id. */
  sourceListingId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  title: string;
  type: ListingType;
  category: ListingCategory;
  rentPeriod: string | null;
  city: string;
  region: string;
  district: string;
  /** Optional registry identifiers, shown on cards when present. */
  planNumber: string;
  blockNumber: string;
  lat: number | null;
  lng: number | null;
  /** Coords came from an exact map pin — render without fallback jitter. */
  precise: boolean;
  price: number;
  /** Optional amount subtracted from `price`; 0 means no discount. */
  discount: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  coverImage: string;
  /** Thumbnail fallback for video-only listings (no image cover exists).
   *  Rendered as a muted <video> preview on cards. Empty otherwise. */
  coverVideo: string;
  media: PublicMedia[];
  featured: boolean;
  /**
   * Multi-unit buildings (note 6): aggregates only — the individual unit docs
   * stay internal to the company. Spec ranges cover the AVAILABLE units.
   */
  unitsAvailable: number;
  unitsTotal: number;
  unitsMinPrice: number | null;
  unitsMaxPrice: number | null;
  unitsBedroomsMin: number | null;
  unitsBedroomsMax: number | null;
  unitsAreaMin: number | null;
  unitsAreaMax: number | null;
  unitsLivingRoomsMax: number | null;
  unitsAnyFurnished: boolean;
  /** Sanitized available units (tenant-free) for the unit details popup. */
  units: PublicListingUnit[];
}

/**
 * Parse the denormalized available-unit list. Defensive re-shaping only —
 * the array is already tenant-free by construction (written that way by the
 * dashboard units manager), and this never reads the units subcollection.
 */
export function parsePublicUnits(value: unknown): PublicListingUnit[] {
  if (!Array.isArray(value)) return [];
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return value
    .filter(
      (u): u is Record<string, unknown> => typeof u === "object" && u !== null,
    )
    .map((u, i) => ({
      id: s(u.id) || String(i),
      label: s(u.label),
      type: u.type === "sale" ? ("sale" as const) : ("rent" as const),
      price: n(u.price) ?? 0,
      rentPeriod: typeof u.rentPeriod === "string" ? u.rentPeriod : null,
      area: n(u.area),
      bedrooms: n(u.bedrooms),
      bathrooms: n(u.bathrooms),
      livingRooms: n(u.livingRooms),
      kitchens: n(u.kitchens),
      majlis: n(u.majlis),
      floor: n(u.floor),
      furnished: u.furnished === true,
      description: s(u.description),
      images: Array.isArray(u.images)
        ? u.images.filter((x): x is string => typeof x === "string")
        : [],
    }));
}

/** Parse a listing's media array (present on the source company listing). */
export function parsePublicMedia(value: unknown): PublicMedia[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (m): m is Record<string, unknown> =>
        typeof m === "object" && m !== null && typeof m.url === "string",
    )
    .map((m, index) => ({
      url: m.url as string,
      type: m.type === "video" ? ("video" as const) : ("image" as const),
      order: typeof m.order === "number" ? m.order : index,
      isCover: Boolean(m.isCover),
    }))
    .sort((a, b) => a.order - b.order);
}

export function mapPublicListing(
  id: string,
  data: DocumentData,
): PublicListing {
  // Coerce to a KNOWN enum value, not just non-null — an unknown/legacy string
  // would otherwise make `LISTING_TYPE_LABELS[type].ar` throw and 500 every
  // public page that renders it (homepage cards, marketplace, detail).
  const type = coerceListingType(data.type);
  const category = coerceListingCategory(data.category);
  return {
    id,
    // On the global mirror `sourceListingId` is stored; on a company listing doc
    // it's absent, so the doc's own id already IS the real listing id.
    sourceListingId:
      typeof data.sourceListingId === "string" ? data.sourceListingId : id,
    companyId: typeof data.companyId === "string" ? data.companyId : "",
    companyName:
      typeof data.companyName === "string"
        ? data.companyName
        : "Real estate company",
    companySlug: typeof data.companySlug === "string" ? data.companySlug : "",
    title: typeof data.title === "string" ? data.title : "Untitled property",
    type,
    category,
    rentPeriod: typeof data.rentPeriod === "string" ? data.rentPeriod : null,
    city:
      typeof data.city === "string"
        ? data.city
        : typeof data.location?.city === "string"
          ? (data.location.city as string)
          : "",
    region:
      typeof data.region === "string"
        ? data.region
        : typeof data.location?.region === "string"
          ? (data.location.region as string)
          : "",
    district:
      typeof data.district === "string"
        ? data.district
        : typeof data.location?.district === "string"
          ? (data.location.district as string)
          : "",
    // Mirrored at top level on the global doc; nested under `details` on the
    // source company listing — read whichever is present.
    planNumber:
      typeof data.planNumber === "string"
        ? data.planNumber
        : typeof data.details?.planNumber === "string"
          ? (data.details.planNumber as string)
          : "",
    blockNumber:
      typeof data.blockNumber === "string"
        ? data.blockNumber
        : typeof data.details?.blockNumber === "string"
          ? (data.details.blockNumber as string)
          : "",
    lat:
      typeof data.lat === "number"
        ? data.lat
        : typeof data.location?.lat === "number"
          ? (data.location.lat as number)
          : null,
    lng:
      typeof data.lng === "number"
        ? data.lng
        : typeof data.location?.lng === "number"
          ? (data.location.lng as number)
          : null,
    // Top-level flag lives on the global mirror; the nested one on the source
    // company listing. Either being true means the pin is an exact location.
    precise:
      data.preciseLocation === true || data.location?.preciseLocation === true,
    price: typeof data.price === "number" ? data.price : 0,
    discount: typeof data.discount === "number" ? data.discount : 0,
    currency: typeof data.currency === "string" ? data.currency : "SAR",
    bedrooms: typeof data.bedrooms === "number" ? data.bedrooms : 0,
    bathrooms: typeof data.bathrooms === "number" ? data.bathrooms : 0,
    area: typeof data.area === "number" ? data.area : 0,
    coverImage:
      typeof data.coverImage === "string" && data.coverImage.length > 0
        ? data.coverImage
        : "",
    // Prefer an explicit mirror field; otherwise derive from media (present on
    // company-listing docs but not on the lean global mirror). Only meaningful
    // when there's no image cover — a still can't be shown for a video-only ad.
    coverVideo: (() => {
      if (typeof data.coverVideo === "string" && data.coverVideo.length > 0) {
        return data.coverVideo;
      }
      const hasImageCover =
        typeof data.coverImage === "string" && data.coverImage.length > 0;
      if (hasImageCover) return "";
      return parsePublicMedia(data.media).find((m) => m.type === "video")?.url ?? "";
    })(),
    media: parsePublicMedia(data.media),
    featured: Boolean(data.featured),
    ...(() => {
      const summary =
        typeof data.unitsSummary === "object" && data.unitsSummary !== null
          ? (data.unitsSummary as Record<string, unknown>)
          : {};
      const n = (v: unknown) => (typeof v === "number" ? v : null);
      return {
        unitsAvailable: n(summary.available) ?? 0,
        unitsTotal: n(summary.total) ?? 0,
        unitsMinPrice: n(summary.minPrice),
        unitsMaxPrice: n(summary.maxPrice),
        unitsBedroomsMin: n(summary.bedroomsMin),
        unitsBedroomsMax: n(summary.bedroomsMax),
        unitsAreaMin: n(summary.areaMin),
        unitsAreaMax: n(summary.areaMax),
        unitsLivingRoomsMax: n(summary.livingRoomsMax),
        unitsAnyFurnished: summary.anyFurnished === true,
        units: parsePublicUnits(data.publicUnits),
      };
    })(),
  };
}

export async function getCompanyBySlug(
  slug: string,
): Promise<PublicCompany | null> {
  const db = getFirebaseDb();
  const companiesRef = collection(db, "companies");
  const q = query(companiesRef, where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const first = snap.docs[0]!;
  const data = first.data();

  const theme =
    typeof data.theme === "object" && data.theme !== null
      ? (data.theme as Record<string, unknown>)
      : {};

  return {
    id: first.id,
    slug,
    name: typeof data.name === "string" ? data.name : "Company",
    description:
      typeof data.description === "string"
        ? data.description
        : "Real estate team focused on premium service.",
    logo: typeof data.logo === "string" ? data.logo : "",
    whatsapp:
      typeof data.contact?.whatsapp === "string" ? data.contact.whatsapp : "",
    phone: typeof data.contact?.phone === "string" ? data.contact.phone : "",
    email: typeof data.contact?.email === "string" ? data.contact.email : "",
    theme: {
      primaryColor:
        typeof theme.primaryColor === "string" ? theme.primaryColor : "#0f6d45",
      secondaryColor:
        typeof theme.secondaryColor === "string"
          ? theme.secondaryColor
          : "#e8d9bf",
      accentColor:
        typeof theme.accentColor === "string" ? theme.accentColor : "#11935d",
    },
  };
}

/** Build a PublicCompany from a raw company doc (slug read from the data). */
export function mapPublicCompany(id: string, data: DocumentData): PublicCompany {
  const theme =
    typeof data.theme === "object" && data.theme !== null
      ? (data.theme as Record<string, unknown>)
      : {};
  return {
    id,
    slug: typeof data.slug === "string" ? data.slug : "",
    name: typeof data.name === "string" ? data.name : "Company",
    description:
      typeof data.description === "string"
        ? data.description
        : "Real estate team focused on premium service.",
    logo: typeof data.logo === "string" ? data.logo : "",
    whatsapp:
      typeof data.contact?.whatsapp === "string" ? data.contact.whatsapp : "",
    phone: typeof data.contact?.phone === "string" ? data.contact.phone : "",
    email: typeof data.contact?.email === "string" ? data.contact.email : "",
    theme: {
      primaryColor:
        typeof theme.primaryColor === "string" ? theme.primaryColor : "#0f6d45",
      secondaryColor:
        typeof theme.secondaryColor === "string"
          ? theme.secondaryColor
          : "#e8d9bf",
      accentColor:
        typeof theme.accentColor === "string" ? theme.accentColor : "#11935d",
    },
  };
}

/** Fetch a company's public profile by its document id (companyId). */
export async function getCompanyById(
  companyId: string,
): Promise<PublicCompany | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, `companies/${companyId}`));
  if (!snap.exists()) return null;
  return mapPublicCompany(snap.id, snap.data());
}

export async function getPublicCompanyListings(
  companyId: string,
): Promise<PublicListing[]> {
  const db = getFirebaseDb();
  const listingsRef = collection(db, `companies/${companyId}/listings`);
  const q = query(listingsRef, where("status", "==", "published"), limit(24));

  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.data().isDeleted !== true)
    .map((d) =>
      mapPublicListing(d.id, {
        ...d.data(),
        companyId,
        companyName: d.data().companyName,
        companySlug: d.data().companySlug,
        city: d.data().location?.city,
      }),
    );
}

export async function getCompanyListingById(
  companyId: string,
  listingId: string,
): Promise<PublicListing | null> {
  const db = getFirebaseDb();
  const ref = doc(db, `companies/${companyId}/listings/${listingId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data();
  if (data.status !== "published" || data.isDeleted === true) return null;

  return mapPublicListing(snap.id, {
    ...data,
    companyId,
    city: data.location?.city,
  });
}

export async function getGlobalListings(): Promise<PublicListing[]> {
  const db = getFirebaseDb();
  const globalRef = collection(db, "global_listings");
  const q = query(globalRef, orderBy("createdAt", "desc"), limit(60));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapPublicListing(d.id, d.data()));
}

export async function getGlobalListingById(
  id: string,
): Promise<PublicListing | null> {
  const db = getFirebaseDb();
  const ref = doc(db, `global_listings/${id}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapPublicListing(snap.id, snap.data());
}
