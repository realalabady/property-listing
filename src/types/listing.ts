import type { Timestamp } from "firebase/firestore";
import type {
  ListingCategory,
  ListingStatus,
  ListingType,
} from "@/constants/listing-categories";

export interface ListingLocation {
  country: string;
  region?: string;
  city: string;
  district?: string;
  address?: string;
  lat?: number;
  lng?: number;
  geohash?: string;
  /** Original Google Maps link pasted by data entry (source of the coords). */
  mapUrl?: string;
  /**
   * True only when lat/lng were extracted from a pasted map pin (exact
   * building), not derived from the city center. The map renders these pins
   * without the fallback jitter so they sit precisely.
   */
  preciseLocation?: boolean;
}

/** Optional contact people attached to a listing (alphanumeric inputs only). */
export interface ListingContact {
  name: string;
  role?: string;
  phone?: string;
  note?: string;
}

/** Confidential owner identity attached to a listing. */
export interface ListingOwnerInfo {
  name?: string;
  phone?: string;
  nationalId?: string;
  note?: string;
}

/** Where a listing came from. "broker" reveals the extra brokerInfo fields. */
export type ListingSource = "owner" | "broker";

/** Agency/broker origin details (shown only when source === "broker"). */
export interface ListingBrokerInfo {
  agencyName?: string;
  brokerName?: string;
  phone?: string;
}

/**
 * Per-platform advertising publish status. Purely an internal checklist so
 * employees can see where a listing has already been advertised.
 */
export interface ListingPublishedOn {
  aqar?: boolean;
  instagram?: boolean;
  x?: boolean;
  facebook?: boolean;
  snapchat?: boolean;
}

/**
 * The person currently tied to a unit (internal only — never public).
 * Holds the tenant on a rented unit, or the buyer on a sold one.
 */
export interface ListingUnitTenant {
  name?: string;
  phone?: string;
  leaseEndsAt?: string; // Gregorian ISO date (yyyy-mm-dd); rent only
}

/** Units can be sold or rented independently of the parent listing's type. */
export type ListingUnitType = "sale" | "rent";

/** `rented` only applies to rent units; `sold` only to sale units. */
export type ListingUnitStatus = "available" | "rented" | "sold";

/**
 * An independently rentable unit inside a parent listing (note 6): one
 * building doc with many unit docs instead of 15 near-duplicate listings.
 * Stored at `companies/{cid}/listings/{lid}/units/{unitId}`. Units are
 * internal — the public marketplace only sees the aggregated `unitsSummary`.
 */
export interface ListingUnit {
  id: string;
  label: string; // e.g. "شقة 12" / "الدور الثاني - يمين"
  type: ListingUnitType;
  status: ListingUnitStatus;
  price: number;
  /** Only meaningful when `type === "rent"`. */
  rentPeriod?: string | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  /** صالات — living rooms. */
  livingRooms?: number | null;
  /** مطابخ — kitchens. */
  kitchens?: number | null;
  /** مجالس — formal reception rooms (a standard Saudi listing spec). */
  majlis?: number | null;
  /** الدور — which floor the unit sits on. */
  floor?: number | null;
  furnished?: boolean;
  description?: string;
  /** Public image URLs for this unit. */
  images?: string[];
  /** Storage paths matching `images`, kept so uploads can be deleted. */
  imagePaths?: string[];
  tenant?: ListingUnitTenant | null;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
}

/**
 * Denormalized unit rollup kept on the parent listing so the marketplace can
 * show "X units available" + a price range without reading the units
 * subcollection (which is internal). Recomputed on every unit write.
 */
export interface ListingUnitsSummary {
  total: number;
  available: number;
  minPrice: number | null;
  maxPrice: number | null;
  /**
   * Spec ranges across the AVAILABLE units only, so a marketplace card can
   * advertise "1-3 غرف • 80-140 م²" for a building whose units differ,
   * without ever exposing the individual (internal) unit docs.
   */
  bedroomsMin?: number | null;
  bedroomsMax?: number | null;
  areaMin?: number | null;
  areaMax?: number | null;
  livingRoomsMax?: number | null;
  anyFurnished?: boolean;
}

/**
 * Public-safe projection of ONE available unit, denormalized onto the parent
 * listing so the marketplace can show unit details without reading the
 * internal `units` subcollection. Deliberately has no tenant/buyer field —
 * that data must never leave the company.
 */
export interface PublicListingUnit {
  id: string;
  label: string;
  type: ListingUnitType;
  price: number;
  rentPeriod?: string | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  livingRooms?: number | null;
  kitchens?: number | null;
  majlis?: number | null;
  floor?: number | null;
  furnished?: boolean;
  description?: string;
  images?: string[];
}

/** Deed/title fields treated as confidential for new listings. */
export interface ListingDeedInfo {
  deedType?: string;
  deedNumber?: string;
  deedIssueDate?: string; // Gregorian ISO date (yyyy-mm-dd)
  deedReference?: string;
  propertyNumber?: string;
}

/**
 * Protected listing data stored at
 * `companies/{cid}/listings/{lid}/private/data`.
 *
 * Readable only by super admins, the listing creator, and members holding the
 * `view_owner_info` permission (enforced in firestore.rules). Legacy listings
 * created before this subdoc existed keep their deed fields in `details` and
 * contacts in `contacts[]` on the main doc.
 */
export interface ListingPrivateData {
  owner?: ListingOwnerInfo;
  deed?: ListingDeedInfo;
  /**
   * Contacts whose phone numbers are restricted when the company visibility
   * setting `visibility.contactPhones` is "restricted" (e.g. caretaker).
   */
  restrictedContacts?: ListingContact[];
  updatedAt?: Timestamp | Date;
  updatedBy?: string;
}

/** Optional, deed/registry-style metadata captured in the listing form. */
export interface ListingDetails {
  usageType?: string;
  propertyTypeName?: string;
  propertyNumber?: string;
  titleEn?: string;
  deedType?: string;
  deedNumber?: string;
  deedIssueDate?: string; // Gregorian ISO date (yyyy-mm-dd)
  propertyArea?: number;
  additionalNumber1?: string;
  additionalNumber2?: string;
  parcelNumber?: string;
  blockNumber?: string;
  buildDate?: string; // Gregorian ISO date (yyyy-mm-dd)
  floorsCount?: number;
  unitsPerFloor?: number;
  electricityMeterNumber?: string;
  electricitySubscriptionNumber?: string;
  waterMeterNumber?: string;
  waterSubscriptionNumber?: string;
  streetName?: string;
  postalCode?: string;
  buildingNumber?: string;
  planNumber?: string;
  deedReference?: string;
  // Rent-specific
  paymentCycle?: "monthly" | "quarterly" | "semiannual" | "annual";
  deposit?: number;
}

/**
 * Optional auction layered on a FOR-SALE listing. The listing's original
 * `price` is untouched — the auction is an add-on. This object is the
 * denormalized live summary kept ON the listing doc so "current bid" is a
 * single cheap read; the individual bids live in the `bids` subcollection.
 */
export interface ListingAuction {
  enabled: boolean;
  status: "open" | "closed";
  /** Opening bid (employee-set; may default to the asking price). */
  startPrice: number;
  /** Minimum raise over the current bid; 0 means any higher amount wins. */
  minIncrement: number;
  /** Highest bid so far; null before the first bid. */
  currentBid: number | null;
  bidCount: number;
  highBidId: string | null;
  /** AUDIT — the employee holding the leading bid. Never public. */
  highBidByEmployeeId: string | null;
  highBidByEmployeeName: string | null;
  /** Optional auto-close time as epoch milliseconds; null = open-ended. */
  endsAt: number | null;
  startedByEmployeeId: string;
  startedAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  closedAt?: Timestamp | Date | null;
}

/**
 * One immutable bid stored at
 * `companies/{cid}/listings/{lid}/bids/{bidId}`. Append-only audit log —
 * records which employee placed each bid. Never exposed publicly.
 */
export interface ListingBid {
  id: string;
  amount: number;
  placedByEmployeeId: string;
  placedByEmployeeName: string;
  /** The bidder the employee logged this bid for (required, validated). */
  bidderName: string;
  bidderPhone: string; // canonical +9665XXXXXXXX
  /** How the bidder reached the company (see BID_SOURCES). */
  bidderSource: string;
  createdAt: Timestamp | Date;
}

/**
 * Public-safe projection of a listing's auction. Deliberately omits the
 * employee audit fields (highBidByEmployeeId/Name) and the bids subcollection.
 * Mirrored onto `global_listings` and the published listing doc.
 */
export interface PublicListingAuction {
  enabled: boolean;
  status: "open" | "closed";
  startPrice: number;
  currentBid: number | null;
  bidCount: number;
  /** Auto-close time as epoch milliseconds; null = open-ended. */
  endsAt: number | null;
}

export interface ListingMedia {
  url: string;
  path: string; // full Storage path (for deletion)
  type: "image" | "video";
  width?: number;
  height?: number;
  order: number;
  alt?: string;
  isCover?: boolean;
}

export interface ListingAmenities {
  parking?: number;
  furnished?: boolean;
  balcony?: boolean;
  garden?: boolean;
  pool?: boolean;
  gym?: boolean;
  security?: boolean;
  elevator?: boolean;
  ac?: boolean;
  heating?: boolean;
  petFriendly?: boolean;
  [k: string]: boolean | number | undefined;
}

export interface ListingAnalytics {
  views: number;
  uniqueViews: number;
  inquiries: number;
  whatsappClicks: number;
  phoneClicks: number;
  favorites: number;
  lastViewedAt?: Timestamp | Date;
}

export interface Listing {
  id: string;
  companyId: string;

  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;

  type: ListingType;
  category: ListingCategory;

  price: number;
  currency: string; // ISO 4217 (e.g. "SAR", "USD")
  priceNegotiable?: boolean;
  rentPeriod?: "monthly" | "yearly" | "daily";

  location: ListingLocation;

  bedrooms?: number;
  bathrooms?: number;
  area: number; // in m² or sqft
  areaUnit: "sqm" | "sqft";
  yearBuilt?: number;
  floorNumber?: number;
  totalFloors?: number;

  amenities: ListingAmenities;

  contacts?: ListingContact[];
  details?: ListingDetails;
  /** True when a `private/data` subdoc exists (owner/deed governance). */
  hasPrivateData?: boolean;

  /** Origin classification (note 8). Defaults to "owner" when absent. */
  source?: ListingSource;
  brokerInfo?: ListingBrokerInfo;
  /** Per-platform advertising checklist (note 9). */
  publishedOn?: ListingPublishedOn;
  /** Rollup of the `units` subcollection (note 6); absent = single-unit. */
  unitsSummary?: ListingUnitsSummary;
  /** Sanitized available-unit list for the public detail page (no tenants). */
  publicUnits?: PublicListingUnit[];

  media: ListingMedia[];
  coverImage?: string; // denormalized first image URL

  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string; // denormalized

  status: ListingStatus;
  featured: boolean;
  publishedAt?: Timestamp | Date | null;

  /** Optional bidding layer (for-sale only); absent = no auction. */
  auction?: ListingAuction;

  analytics: ListingAnalytics;

  createdBy: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Denormalized shape for global marketplace search.
 * Synced from companies/{cid}/listings via Cloud Function.
 */
export interface GlobalListing {
  id: string; // same as companies/{cid}/listings/{lid}.id
  companyId: string;
  companyName: string;
  companySlug: string;
  companyLogo?: string;

  title: string;
  titleAr?: string;
  type: ListingType;
  category: ListingCategory;
  price: number;
  currency: string;
  rentPeriod?: string | null;

  city: string;
  country: string;
  region?: string;
  district?: string;
  lat?: number;
  lng?: number;
  /** Mirror of location.preciseLocation — coords come from an exact map pin. */
  preciseLocation?: boolean;

  bedrooms?: number;
  bathrooms?: number;
  area: number;
  areaUnit: "sqm" | "sqft";

  coverImage?: string;
  status: "published";
  featured: boolean;

  /** Public-safe auction summary; null = no active auction. */
  auction?: PublicListingAuction | null;

  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
