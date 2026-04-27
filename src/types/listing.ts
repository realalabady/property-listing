import type { Timestamp } from "firebase/firestore";
import type {
  ListingCategory,
  ListingStatus,
  ListingType,
} from "@/constants/listing-categories";

export interface ListingLocation {
  country: string;
  city: string;
  district?: string;
  address?: string;
  lat?: number;
  lng?: number;
  geohash?: string;
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
  currency: string; // ISO 4217 (e.g. "AED", "SAR", "USD")
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

  city: string;
  country: string;
  district?: string;

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
