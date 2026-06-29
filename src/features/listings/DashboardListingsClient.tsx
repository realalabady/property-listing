"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LISTING_CATEGORIES,
  LISTING_CATEGORY_LABELS,
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  LISTING_TYPE_LABELS,
  LISTING_TYPES,
  type ListingCategory,
  type ListingStatus,
  type ListingType,
} from "@/constants/listing-categories";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { SARPrice } from "@/components/ui/SARPrice";
import { t } from "@/lib/i18n";

type StatusFilter = "all" | ListingStatus;

interface ListingRow {
  id: string;
  title: string;
  type: ListingType;
  category: ListingCategory;
  price: number;
  currency: string;
  city: string;
  status: ListingStatus;
  featured: boolean;
  mediaCount: number;
  coverImage: string | null;
  updatedAt: Date | null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function firstMediaUrl(media: unknown): string | null {
  if (!Array.isArray(media)) return null;
  const cover = media.find(
    (m): m is Record<string, unknown> =>
      typeof m === "object" && m !== null && Boolean((m as { isCover?: unknown }).isCover),
  );
  const pick = cover ?? media[0];
  if (
    pick &&
    typeof pick === "object" &&
    typeof (pick as { url?: unknown }).url === "string"
  ) {
    return (pick as { url: string }).url;
  }
  return null;
}

function mapListingDoc(id: string, data: DocumentData): ListingRow {
  const type = (data.type as ListingType) ?? LISTING_TYPES.SALE;
  const category =
    (data.category as ListingCategory) ?? LISTING_CATEGORIES.APARTMENT;
  const status = (data.status as ListingStatus) ?? LISTING_STATUSES.DRAFT;

  return {
    id,
    title:
      typeof data.title === "string" ? data.title : t("listings.untitled"),
    type,
    category,
    price: typeof data.price === "number" ? data.price : 0,
    currency: typeof data.currency === "string" ? data.currency : "SAR",
    city:
      typeof data.location?.city === "string"
        ? (data.location.city as string)
        : t("listings.unknownCity"),
    status,
    featured: Boolean(data.featured),
    mediaCount: Array.isArray(data.media) ? data.media.length : 0,
    coverImage:
      typeof data.coverImage === "string" && data.coverImage.length > 0
        ? data.coverImage
        : firstMediaUrl(data.media),
    updatedAt: toDate(data.updatedAt),
  };
}

interface DashboardListingsClientProps {
  companyId: string;
}

export function DashboardListingsClient({
  companyId,
}: DashboardListingsClientProps) {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Firestore Security Rules check `request.auth` (companyId claim). On a cold
  // page load the listener can attach before Firebase Auth restores the user,
  // which sends the read unauthenticated and trips "Missing or insufficient
  // permissions". Gate the subscription on auth being ready.
  const { user: authUser, loading: authLoading } = useAuth();

  useEffect(() => {
    // Still restoring the client Firebase session — keep showing the spinner.
    if (authLoading) return;

    // The dashboard chrome is server-authenticated, but Firestore reads use the
    // CLIENT token. If the browser has no signed-in user, or is signed in as a
    // DIFFERENT account than this company (e.g. a customer account from the
    // marketplace), the read would be denied — surface a clear re-login prompt
    // instead of spinning forever.
    //
    // BUT right after login the client Firebase user can be momentarily null
    // while the SDK restores the session (a transient accounts:lookup race), so
    // declaring "session expired" immediately flashes a false error. Wait out a
    // short grace window first — when authUser arrives this effect re-runs and
    // the timer is cleared before it can fire.
    if (!authUser) {
      const graceTimer = setTimeout(() => {
        setError(t("listings.sessionExpired"));
        setLoading(false);
      }, 2500);
      return () => clearTimeout(graceTimer);
    }
    if (authUser.companyId !== companyId) {
      setError(t("listings.accountMismatch"));
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getFirebaseDb();
    const listingsRef = collection(db, `companies/${companyId}/listings`);
    const q = query(listingsRef, orderBy("updatedAt", "desc"), limit(100));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => mapListingDoc(d.id, d.data()));
        setListings(rows);
        setLoading(false);
        setError(null);
      },
      (snapError) => {
        setError(snapError.message);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [companyId, authLoading, authUser]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return listings;
    return listings.filter((l) => l.status === statusFilter);
  }, [listings, statusFilter]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {t("listings.inventoryTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("listings.inventorySubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              {t("common.status")}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            >
              <option value="all">{t("common.all")}</option>
              {Object.values(LISTING_STATUSES).map((status) => (
                <option key={status} value={status}>
                  {LISTING_STATUS_LABELS[status].ar}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </section>

      {loading && (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          {t("listings.loadingListings")}
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          {t("listings.noMatch")}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((listing) => (
            <Link
              key={listing.id}
              href={ROUTES.DASHBOARD_LISTING_DETAIL(listing.id)}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            >
              <div className="relative h-44 w-full bg-secondary">
                {listing.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.coverImage}
                    alt={listing.title}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    {t("listings.noImage")}
                  </div>
                )}

                <div className="absolute right-2 top-2 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold backdrop-blur",
                      listing.status === LISTING_STATUSES.PUBLISHED
                        ? "bg-success/80 text-success-foreground"
                        : "bg-background/80 text-foreground",
                    )}
                  >
                    {LISTING_STATUS_LABELS[listing.status].ar}
                  </span>
                  {listing.featured && (
                    <span className="rounded-md bg-primary/80 px-2 py-1 text-xs font-semibold text-primary-foreground backdrop-blur">
                      ★
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <h4 className="line-clamp-1 font-semibold text-foreground">
                  {listing.title}
                </h4>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {listing.city} • {LISTING_CATEGORY_LABELS[listing.category].ar}{" "}
                  • {LISTING_TYPE_LABELS[listing.type].ar}
                </p>

                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="font-semibold text-foreground">
                    <SARPrice amount={listing.price} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("listings.mediaCount", { count: listing.mediaCount })}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {listing.updatedAt
                    ? `${t("common.updated")}: ${formatDate(listing.updatedAt)}`
                    : null}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
