import {
  LISTING_CATEGORY_LABELS,
  type ListingCategory,
  type ListingType,
} from "@/constants/listing-categories";
import type { PublicListing } from "./data";

/**
 * Shared search/filter contract for the public marketplace.
 * The landing-page search bar serializes these into the URL and the
 * `/properties` page deserializes + applies them — so search "just works"
 * end to end instead of being a decorative form.
 */
export interface ListingFilters {
  q: string;
  type: ListingType | "";
  category: ListingCategory | "";
  region: string;
  city: string;
  district: string;
  bedrooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
}

export const EMPTY_FILTERS: ListingFilters = {
  q: "",
  type: "",
  category: "",
  region: "",
  city: "",
  district: "",
  bedrooms: null,
  minPrice: null,
  maxPrice: null,
};

/** Common Saudi cities offered as quick suggestions in the search bar. */
export const SAUDI_CITIES: Array<{ ar: string; en: string }> = [
  { ar: "الرياض", en: "Riyadh" },
  { ar: "جدة", en: "Jeddah" },
  { ar: "مكة", en: "Makkah" },
  { ar: "المدينة المنورة", en: "Madinah" },
  { ar: "الدمام", en: "Dammam" },
  { ar: "الخبر", en: "Khobar" },
  { ar: "الطائف", en: "Taif" },
  { ar: "تبوك", en: "Tabuk" },
  { ar: "أبها", en: "Abha" },
  { ar: "بريدة", en: "Buraidah" },
];

/** Arabic suffix for a rent period, e.g. "/ شهرياً". Empty for non-rent. */
export function rentPeriodSuffix(
  type: ListingType,
  rentPeriod: string | null,
): string {
  if (type !== "rent") return "";
  switch (rentPeriod) {
    case "yearly":
      return "/ سنوياً";
    case "daily":
      return "/ يومياً";
    case "monthly":
    default:
      return "/ شهرياً";
  }
}

export const CATEGORY_OPTIONS = (
  Object.keys(LISTING_CATEGORY_LABELS) as ListingCategory[]
).map((value) => ({ value, ...LISTING_CATEGORY_LABELS[value] }));

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Read filters from URLSearchParams (the marketplace entry point). */
export function filtersFromParams(
  params: URLSearchParams | ReadonlyURLSearchParamsLike,
): ListingFilters {
  return {
    q: params.get("q") ?? "",
    type: (params.get("type") as ListingType | null) ?? "",
    category: (params.get("category") as ListingCategory | null) ?? "",
    region: params.get("region") ?? "",
    city: params.get("city") ?? "",
    district: params.get("district") ?? "",
    bedrooms: parseNumber(params.get("bedrooms")),
    minPrice: parseNumber(params.get("minPrice")),
    maxPrice: parseNumber(params.get("maxPrice")),
  };
}

/** Serialize filters into a query string (drops empty values for clean URLs). */
export function filtersToQuery(filters: ListingFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.type) params.set("type", filters.type);
  if (filters.category) params.set("category", filters.category);
  if (filters.region.trim()) params.set("region", filters.region.trim());
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.district.trim()) params.set("district", filters.district.trim());
  if (filters.bedrooms != null) params.set("bedrooms", String(filters.bedrooms));
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function hasActiveFilters(filters: ListingFilters): boolean {
  return (
    filters.q.trim() !== "" ||
    filters.type !== "" ||
    filters.category !== "" ||
    filters.region.trim() !== "" ||
    filters.city.trim() !== "" ||
    filters.district.trim() !== "" ||
    filters.bedrooms != null ||
    filters.minPrice != null ||
    filters.maxPrice != null
  );
}

/**
 * Cross-language city match. Listings may store the city in English ("riyadh")
 * while the search bar serializes the Arabic name ("الرياض") — a naive
 * `includes` would never match. We resolve both sides through the known
 * Arabic↔English alias table so either language matches either language.
 */
export function cityMatches(listingCity: string, queryCity: string): boolean {
  const q = queryCity.trim().toLowerCase();
  if (!q) return true;
  const lc = listingCity.trim().toLowerCase();
  if (!lc) return false;

  // Same-language substring (handles partial typing).
  if (lc.includes(q) || q.includes(lc)) return true;

  // Cross-language: find the canonical city the query refers to, then check
  // the listing's city against that city's other-language name.
  const alias = SAUDI_CITIES.find((c) => {
    const ar = c.ar.toLowerCase();
    const en = c.en.toLowerCase();
    return ar.includes(q) || en.includes(q) || q.includes(ar) || q.includes(en);
  });
  if (!alias) return false;

  const ar = alias.ar.toLowerCase();
  const en = alias.en.toLowerCase();
  return (
    lc.includes(ar) || lc.includes(en) || ar.includes(lc) || en.includes(lc)
  );
}

/** Loose, case-insensitive substring match in either direction. */
function nameMatches(value: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return v.includes(q) || q.includes(v);
}

/**
 * Optional geo context so region matching can fall back to "is this listing's
 * city inside the selected region?" — far more reliable than comparing the
 * listing's free-text region string (which may be English, abbreviated, or
 * missing) against the dataset's Arabic region name.
 */
export interface ApplyFiltersOptions {
  /** Lower-cased city names (ar + en) that belong to the selected region. */
  regionCities?: Set<string>;
}

/** Apply all active filters to a list of listings. */
export function applyFilters(
  listings: PublicListing[],
  filters: ListingFilters,
  opts?: ApplyFiltersOptions,
): PublicListing[] {
  const term = filters.q.trim().toLowerCase();
  const region = filters.region.trim();
  const city = filters.city.trim();
  const district = filters.district.trim();
  const regionCities = opts?.regionCities;

  // Forgiving price bounds: if both are set and crossed (min > max), treat the
  // smaller as the floor and the larger as the ceiling so a mis-entered pair
  // never silently empties the results.
  let lo = filters.minPrice;
  let hi = filters.maxPrice;
  if (lo != null && hi != null && lo > hi) {
    [lo, hi] = [hi, lo];
  }

  return listings.filter((listing) => {
    if (
      term &&
      !listing.title.toLowerCase().includes(term) &&
      !listing.companyName.toLowerCase().includes(term) &&
      !cityMatches(listing.city, term)
    ) {
      return false;
    }
    if (region) {
      const byName = nameMatches(listing.region, region);
      const lc = listing.city.trim().toLowerCase();
      const byCity =
        !!regionCities &&
        !!lc &&
        [...regionCities].some((n) => lc.includes(n) || n.includes(lc));
      if (!byName && !byCity) return false;
    }
    if (city && !cityMatches(listing.city, city)) return false;
    if (district && !nameMatches(listing.district, district)) return false;
    if (filters.type && listing.type !== filters.type) return false;
    if (filters.category && listing.category !== filters.category) return false;
    if (filters.bedrooms != null && listing.bedrooms < filters.bedrooms) {
      return false;
    }
    if (lo != null && listing.price < lo) return false;
    if (hi != null && listing.price > hi) return false;
    return true;
  });
}

// Minimal structural type so this file doesn't depend on next/navigation types.
interface ReadonlyURLSearchParamsLike {
  get(name: string): string | null;
}
