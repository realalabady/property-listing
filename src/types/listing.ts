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
}

/** Optional contact people attached to a listing (alphanumeric inputs only). */
export interface ListingContact {
  name: string;
  role?: string;
  phone?: string;
  note?: string;
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
  deedReference?: string;
  // Rent-specific
  paymentCycle?: "monthly" | "quarterly" | "semiannual" | "annual";
  deposit?: number;
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

  media: ListingMedia[];
  coverImage?: string; // denormalized first image URL

  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string; // denormalized

  status: ListingStatus;
  featured: boolean;
  publishedAt?: Timestamp | Date | null;

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

  bedrooms?: number;
  bathrooms?: number;
  area: number;
  areaUnit: "sqm" | "sqft";

  coverImage?: string;
  status: "published";
  featured: boolean;

  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
