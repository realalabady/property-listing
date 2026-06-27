import { createHash } from "crypto";
import {
  LISTING_CATEGORIES,
  LISTING_TYPES,
} from "@/constants/listing-categories";
import { normalizeText } from "@/lib/api/company-leads";

/**
 * Normalisation + dedupe key for a logged customer search. The stored shape
 * mirrors the marketplace `ListingFilters` so the matching engine can score it
 * directly against listings.
 */

const TYPE_VALUES = new Set<string>(Object.values(LISTING_TYPES));
const CATEGORY_VALUES = new Set<string>(Object.values(LISTING_CATEGORIES));

export interface NormalizedSearchCriteria {
  q?: string;
  type?: string;
  category?: string;
  region?: string;
  city?: string;
  district?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
}

function toNonNegativeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Clean a raw criteria object into a stored shape, or null if it's empty. */
export function normalizeSearchCriteria(
  value: unknown,
): NormalizedSearchCriteria | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  const out: NormalizedSearchCriteria = {};

  const q = normalizeText(r.q);
  if (q) out.q = q.slice(0, 120);
  if (typeof r.type === "string" && TYPE_VALUES.has(r.type)) out.type = r.type;
  if (typeof r.category === "string" && CATEGORY_VALUES.has(r.category)) {
    out.category = r.category;
  }
  const region = normalizeText(r.region);
  if (region) out.region = region;
  const city = normalizeText(r.city);
  if (city) out.city = city;
  const district = normalizeText(r.district);
  if (district) out.district = district;

  const bedrooms = toNonNegativeNumber(r.bedrooms);
  if (bedrooms != null) out.bedrooms = bedrooms;
  const minPrice = toNonNegativeNumber(r.minPrice);
  if (minPrice != null) out.minPrice = minPrice;
  const maxPrice = toNonNegativeNumber(r.maxPrice);
  if (maxPrice != null) out.maxPrice = maxPrice;

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Stable hash of (customer + criteria) used as the Firestore doc id so repeat
 * identical searches update one record instead of flooding the collection.
 */
export function searchDocId(
  customerId: string,
  criteria: NormalizedSearchCriteria,
): string {
  // Deterministic key order → identical criteria always hash the same.
  const ordered = Object.keys(criteria)
    .sort()
    .map((k) => `${k}=${String(criteria[k as keyof NormalizedSearchCriteria])}`)
    .join("&");
  const hash = createHash("sha1")
    .update(`${customerId}|${ordered}`)
    .digest("hex")
    .slice(0, 16);
  return `${customerId}_${hash}`;
}
