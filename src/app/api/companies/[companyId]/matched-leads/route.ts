import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canViewMatchedLeads, serializeDate } from "@/lib/api/company-leads";
import { adminDb } from "@/lib/firebase/admin";
import {
  bestMatch,
  MATCH_THRESHOLD,
  type MatchCriteria,
  type ScorableListing,
} from "@/features/matching/score";

export const runtime = "nodejs";

interface CompanyListing extends ScorableListing {
  id: string;
  title: string;
  currency: string;
  coverImage: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Map a Firestore listing doc to the fields the matcher + UI need. */
function mapListing(id: string, data: Record<string, unknown>): CompanyListing {
  const location = (data.location ?? {}) as Record<string, unknown>;
  return {
    id,
    title: str(data.title) || "عقار",
    type: str(data.type),
    category: str(data.category),
    city: str(data.city) || str(location.city),
    region: str(data.region) || str(location.region),
    district: str(data.district) || str(location.district),
    price: num(data.price),
    bedrooms: num(data.bedrooms),
    currency: str(data.currency) || "SAR",
    coverImage: str(data.coverImage),
  };
}

/**
 * GET /api/companies/[companyId]/matched-leads
 * Company-scoped. Scores recent customer searches against THIS company's own
 * published listings and returns the matches (≥ threshold), best first.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (user.companyId !== companyId || !canViewMatchedLeads(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const minParam = Number(req.nextUrl.searchParams.get("min"));
  const threshold =
    Number.isFinite(minParam) && minParam >= 0 && minParam <= 100
      ? minParam
      : MATCH_THRESHOLD;

  // 1) This company's published inventory.
  const listingsSnap = await adminDb()
    .collection(`companies/${companyId}/listings`)
    .where("status", "==", "published")
    .limit(300)
    .get();
  const listings = listingsSnap.docs.map((d) => mapListing(d.id, d.data()));

  if (listings.length === 0) {
    return NextResponse.json({ leads: [], threshold });
  }

  // 2) Recent customer searches.
  const searchesSnap = await adminDb()
    .collection("customer_searches")
    .orderBy("lastSearchedAt", "desc")
    .limit(200)
    .get();

  // 3) Score each search against the inventory; keep the best per search.
  const leads = searchesSnap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      // Privacy: only surface customers who consented to being contacted.
      if (data.contactConsent !== true) return null;
      const criteria = (data.criteria ?? {}) as MatchCriteria;
      const match = bestMatch(criteria, listings);
      if (!match || match.score < threshold) return null;

      const { listing, score, breakdown } = match;
      return {
        id: doc.id,
        customer: {
          name: str(data.customerName),
          phone: str(data.customerPhone),
          email: str(data.customerEmail),
          preferredContactMethod: str(data.preferredContactMethod) || null,
        },
        criteria,
        score,
        breakdown,
        matchedListing: {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          currency: listing.currency,
          city: listing.city,
          coverImage: listing.coverImage,
        },
        searchCount: num(data.searchCount),
        lastSearchedAt: serializeDate(data.lastSearchedAt),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ leads, threshold });
}
