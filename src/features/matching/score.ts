import { cityMatches, nameMatches } from "@/features/public/filters";

/**
 * Transparent, explainable listing↔requirement matching.
 *
 * A customer's search criteria are scored against a listing field-by-field.
 * Only criteria the customer actually specified contribute to the score
 * (the denominator is the sum of *applicable* weights), so a customer who only
 * cares about city + type isn't penalised for leaving budget blank.
 *
 *   score = round(earned / applicable * 100)   // 0–100
 *
 * The per-field `breakdown` is returned so the UI can show *why* a lead matched
 * ("city ✓, type ✓, bedrooms off by one") instead of an opaque number.
 *
 * Reuses the marketplace's own matchers (`cityMatches` cross-language,
 * `nameMatches` loose substring) so scoring stays consistent with search.
 */

/** What the customer searched for. Mirrors the marketplace `ListingFilters`. */
export interface MatchCriteria {
  type?: string | null;
  category?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  bedrooms?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}

/** Minimal listing shape needed to score. `PublicListing` satisfies this. */
export interface ScorableListing {
  type: string;
  category: string;
  city: string;
  region: string;
  district: string;
  price: number;
  bedrooms: number;
}

export type MatchField =
  | "type"
  | "category"
  | "city"
  | "region"
  | "district"
  | "price"
  | "bedrooms";

export interface MatchBreakdownEntry {
  weight: number;
  earned: number;
}

export interface MatchResult {
  score: number;
  breakdown: Partial<Record<MatchField, MatchBreakdownEntry>>;
}

export interface BestMatch<T> extends MatchResult {
  listing: T;
}

/** Field weights — relative importance of each criterion. */
const WEIGHTS: Record<MatchField, number> = {
  type: 25,
  category: 20,
  city: 20,
  region: 10,
  district: 10,
  price: 15,
  bedrooms: 10,
};

/** Listings within this fraction *over* the customer's max budget half-count. */
const PRICE_TOLERANCE = 0.1;

function hasText(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Score how well a single listing matches the criteria (0–100 + breakdown). */
export function scoreMatch(
  criteria: MatchCriteria,
  listing: ScorableListing,
): MatchResult {
  const breakdown: Partial<Record<MatchField, MatchBreakdownEntry>> = {};
  let applicable = 0;
  let earned = 0;

  const add = (field: MatchField, earnedPoints: number) => {
    const weight = WEIGHTS[field];
    applicable += weight;
    earned += earnedPoints;
    breakdown[field] = { weight, earned: earnedPoints };
  };

  if (hasText(criteria.type)) {
    add("type", listing.type === criteria.type ? WEIGHTS.type : 0);
  }
  if (hasText(criteria.category)) {
    add("category", listing.category === criteria.category ? WEIGHTS.category : 0);
  }
  if (hasText(criteria.city)) {
    add("city", cityMatches(listing.city, criteria.city) ? WEIGHTS.city : 0);
  }
  if (hasText(criteria.region)) {
    add(
      "region",
      nameMatches(listing.region, criteria.region) ? WEIGHTS.region : 0,
    );
  }
  if (hasText(criteria.district)) {
    add(
      "district",
      nameMatches(listing.district, criteria.district) ? WEIGHTS.district : 0,
    );
  }

  const min = criteria.minPrice;
  const max = criteria.maxPrice;
  if (min != null || max != null) {
    const aboveMin = min == null || listing.price >= min;
    const belowMax = max == null || listing.price <= max;
    let pricePoints = 0;
    if (aboveMin && belowMax) {
      pricePoints = WEIGHTS.price;
    } else if (
      // Just over budget (within tolerance) still half-counts — close enough
      // to be worth a salesperson's call.
      max != null &&
      aboveMin &&
      listing.price <= max * (1 + PRICE_TOLERANCE)
    ) {
      pricePoints = WEIGHTS.price / 2;
    }
    add("price", pricePoints);
  }

  if (criteria.bedrooms != null) {
    const diff = Math.abs(listing.bedrooms - criteria.bedrooms);
    const bedroomPoints =
      diff === 0 ? WEIGHTS.bedrooms : diff === 1 ? WEIGHTS.bedrooms / 2 : 0;
    add("bedrooms", bedroomPoints);
  }

  const score = applicable > 0 ? Math.round((earned / applicable) * 100) : 0;
  return { score, breakdown };
}

/** Default minimum score (%) for a match to be worth surfacing as a lead. */
export const MATCH_THRESHOLD = 50;

/**
 * Find the single best-scoring listing for the given criteria.
 * Returns null when there are no listings.
 */
export function bestMatch<T extends ScorableListing>(
  criteria: MatchCriteria,
  listings: T[],
): BestMatch<T> | null {
  let best: BestMatch<T> | null = null;
  for (const listing of listings) {
    const result = scoreMatch(criteria, listing);
    if (!best || result.score > best.score) {
      best = { listing, ...result };
    }
  }
  return best;
}
