import "server-only";
import { cache } from "react";
import { adminDb } from "@/lib/firebase/admin";
import {
  mapPublicCompany,
  mapPublicListing,
  type PublicCompany,
  type PublicListing,
} from "./data";

/**
 * Server-side counterparts of the public data fetchers in `./data`.
 *
 * These run in Server Components via the Admin SDK (a warm, pooled connection
 * that sits next to Firestore) so the detail pages arrive fully rendered —
 * instead of the browser opening a cold client Firestore connection and doing
 * sequential reads after hydration (the ~4s idle "waterfall"). The pure
 * mappers are shared with the client module so shapes stay identical.
 *
 * Wrapped in React `cache()` so a read is de-duplicated within a single request
 * (e.g. `generateMetadata` + the page body asking for the same doc).
 */

export const getCompanyBySlugServer = cache(
  async (slug: string): Promise<PublicCompany | null> => {
    const snap = await adminDb()
      .collection("companies")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return mapPublicCompany(doc.id, doc.data());
  },
);

export const getCompanyByIdServer = cache(
  async (companyId: string): Promise<PublicCompany | null> => {
    const snap = await adminDb().doc(`companies/${companyId}`).get();
    if (!snap.exists) return null;
    return mapPublicCompany(snap.id, snap.data() ?? {});
  },
);

export const getCompanyListingByIdServer = cache(
  async (
    companyId: string,
    listingId: string,
  ): Promise<PublicListing | null> => {
    const snap = await adminDb()
      .doc(`companies/${companyId}/listings/${listingId}`)
      .get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    // Same public gate the client fetcher enforces.
    if (data.status !== "published" || data.isDeleted === true) return null;
    return mapPublicListing(snap.id, {
      ...data,
      companyId,
      city: (data.location as Record<string, unknown> | undefined)?.city,
    });
  },
);

export const getGlobalListingByIdServer = cache(
  async (id: string): Promise<PublicListing | null> => {
    const snap = await adminDb().doc(`global_listings/${id}`).get();
    if (!snap.exists) return null;
    return mapPublicListing(snap.id, snap.data() ?? {});
  },
);
