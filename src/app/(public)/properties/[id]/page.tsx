import type { Metadata } from "next";
import { MarketplaceDetailClient } from "@/features/public/MarketplaceDetailClient";
import { DarPublicShell } from "@/features/public/DarPublicShell";
import { adminDb } from "@/lib/firebase/admin";
import {
  getCompanyByIdServer,
  getCompanyListingByIdServer,
  getGlobalListingByIdServer,
} from "@/features/public/data.server";

// firebase-admin (used in generateMetadata) is not Edge-compatible.
export const runtime = "nodejs";

/**
 * Rich link preview for shared property URLs (WhatsApp/Twitter/etc.). Reads the
 * public `global_listings/{id}` mirror and exposes an Open Graph card so the
 * pasted link renders with the company logo (or the cover photo) + price/city
 * instead of a bare URL.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = { title: "تفاصيل العقار" };

  try {
    const snap = await adminDb().doc(`global_listings/${id}`).get();
    if (!snap.exists) return fallback;

    const d = snap.data() as Record<string, unknown>;
    const title = typeof d.title === "string" ? d.title : "تفاصيل العقار";
    const city = typeof d.city === "string" ? d.city : "";
    const district = typeof d.district === "string" ? d.district : "";
    const price = typeof d.price === "number" ? d.price : null;

    const descParts: string[] = [];
    if (price) descParts.push(`${price.toLocaleString("en-US")} ريال`);
    const place = [city, district].filter(Boolean).join(" - ");
    if (place) descParts.push(place);
    const description = descParts.join(" • ") || "عقار معروض على منصة دار";

    // Prefer the company logo (branding), fall back to the listing cover photo.
    const image =
      (typeof d.companyLogo === "string" && d.companyLogo) ||
      (typeof d.coverImage === "string" && d.coverImage) ||
      "";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        ...(image ? { images: [{ url: image }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return fallback;
  }
}

export default async function MarketplaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Resolve on the server so the page ships fully rendered (no client-side
  // Firestore waterfall). The global mirror only holds the cover image, so —
  // like the client did — load the source company listing for the full gallery,
  // and the company for its public contact. Both only need companyId, so run
  // them in parallel.
  const global = await getGlobalListingByIdServer(id);
  let initialListing = global;
  let initialCompany = null;
  if (global?.companyId) {
    const [source, company] = await Promise.all([
      getCompanyListingByIdServer(global.companyId, global.sourceListingId),
      getCompanyByIdServer(global.companyId),
    ]);
    if (source) initialListing = source;
    initialCompany = company;
  }

  return (
    <DarPublicShell>
      <MarketplaceDetailClient
        listingId={id}
        initialListing={initialListing}
        initialCompany={initialCompany}
      />
    </DarPublicShell>
  );
}
