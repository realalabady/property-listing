"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
} from "firebase/firestore";
import { UserRound } from "lucide-react";
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
  district: string;
  region: string;
  status: ListingStatus;
  featured: boolean;
  mediaCount: number;
  coverImage: string | null;
  updatedAt: Date | null;
  /** uid of the employee who created the listing (internal only). */
  createdBy: string | null;
  /** Denormalized name when present; otherwise resolved from the roster. */
  createdByName: string | null;
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
    district:
      typeof data.location?.district === "string"
        ? (data.location.district as string)
        : "",
    region:
      typeof data.location?.region === "string"
        ? (data.location.region as string)
        : "",
    status,
    featured: Boolean(data.featured),
    mediaCount: Array.isArray(data.media) ? data.media.length : 0,
    coverImage:
      typeof data.coverImage === "string" && data.coverImage.length > 0
        ? data.coverImage
        : firstMediaUrl(data.media),
    updatedAt: toDate(data.updatedAt),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    createdByName:
      typeof data.createdByName === "string" ? data.createdByName : null,
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
  const [typeFilter, setTypeFilter] = useState<"all" | ListingType>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ListingCategory>(
    "all",
  );
  const [publisherFilter, setPublisherFilter] = useState<string>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState("");
  /** uid -> employee name, for showing who published each listing. */
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>(
    {},
  );

  // Firestore Security Rules check `request.auth` (companyId claim). On a cold
  // page load the listener can attach before Firebase Auth restores the user,
  // which sends the read unauthenticated and trips "Missing or insufficient
  // permissions". Gate the subscription on auth being ready.
  const { user: authUser, loading: authLoading } = useAuth();

  useEffect(() => {
    // Still restoring the client Firebase session — keep showing the spinner.
    if (authLoading) return;

    // The dashboard chrome is server-authenticated, but Firestore reads use
    // the CLIENT token. If the browser has no signed-in user the session has
    // ended — the layout-level <SessionEndedSignOut /> signs the user out and
    // returns them to the login page, so just keep the spinner (no banner).
    if (!authUser) return;
    if (authUser.companyId !== companyId) {
      setError(t("listings.accountMismatch"));
      setLoading(false);
      return;
    }

    // Resolve creator uids to names for the "published by" line. Listings
    // created before this field was denormalized only carry `createdBy`, so
    // the roster is the reliable source. Reading employees needs the
    // view_employees permission — if it's denied we just omit the name.
    getDocs(collection(getFirebaseDb(), `companies/${companyId}/employees`))
      .then((snap) => {
        const names: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const name = d.data().name;
          if (typeof name === "string" && name.length > 0) names[d.id] = name;
        });
        setEmployeeNames(names);
      })
      .catch(() => undefined);

    setLoading(true);
    const db = getFirebaseDb();
    const listingsRef = collection(db, `companies/${companyId}/listings`);
    const q = query(listingsRef, orderBy("updatedAt", "desc"), limit(100));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .filter((d) => d.data().isDeleted !== true)
          .map((d) => mapListingDoc(d.id, d.data()));
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

  const myUid = authUser?.uid ?? null;

  // Distinct creators present in the current listings, for the "publisher"
  // dropdown. Name comes from the denormalized field or the roster; unknowns
  // still get an option so their listings remain filterable.
  const publisherOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of listings) {
      if (!l.createdBy) continue;
      const name =
        l.createdByName ??
        employeeNames[l.createdBy] ??
        t("listings.unknownPublisher");
      map.set(l.createdBy, name);
    }
    return Array.from(map, ([uid, name]) => ({ uid, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [listings, employeeNames]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (typeFilter !== "all" && l.type !== typeFilter) return false;
      if (categoryFilter !== "all" && l.category !== categoryFilter)
        return false;
      if (onlyMine && l.createdBy !== myUid) return false;
      if (
        !onlyMine &&
        publisherFilter !== "all" &&
        l.createdBy !== publisherFilter
      ) {
        return false;
      }
      if (
        term &&
        !l.title.toLowerCase().includes(term) &&
        !l.city.toLowerCase().includes(term) &&
        !l.district.toLowerCase().includes(term) &&
        !l.region.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [
    listings,
    statusFilter,
    typeFilter,
    categoryFilter,
    publisherFilter,
    onlyMine,
    myUid,
    search,
  ]);

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
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("listings.searchPlaceholder")}
              className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 md:w-64"
            />
            <select
              aria-label={t("common.status")}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            >
              <option value="all">{t("common.status")}</option>
              {Object.values(LISTING_STATUSES).map((status) => (
                <option key={status} value={status}>
                  {LISTING_STATUS_LABELS[status].ar}
                </option>
              ))}
            </select>

            <select
              aria-label={t("listings.filterType")}
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "all" | ListingType)
              }
              className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            >
              <option value="all">{t("listings.allTypes")}</option>
              {Object.values(LISTING_TYPES).map((type) => (
                <option key={type} value={type}>
                  {LISTING_TYPE_LABELS[type].ar}
                </option>
              ))}
            </select>

            <select
              aria-label={t("listings.filterCategory")}
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as "all" | ListingCategory)
              }
              className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            >
              <option value="all">{t("listings.allCategories")}</option>
              {Object.values(LISTING_CATEGORIES).map((category) => (
                <option key={category} value={category}>
                  {LISTING_CATEGORY_LABELS[category].ar}
                </option>
              ))}
            </select>

            <select
              aria-label={t("listings.publisher")}
              value={publisherFilter}
              disabled={onlyMine}
              onChange={(e) => setPublisherFilter(e.target.value)}
              className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-50"
            >
              <option value="all">{t("listings.allPublishers")}</option>
              {publisherOptions.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.name}
                </option>
              ))}
            </select>

            {myUid && (
              <button
                type="button"
                onClick={() => setOnlyMine((v) => !v)}
                aria-pressed={onlyMine}
                className={cn(
                  "h-11 rounded-lg border px-3.5 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                  onlyMine
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground hover:bg-secondary",
                )}
              >
                {t("listings.myListings")}
              </button>
            )}
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

                {/* Internal-only: who published this. Never shown publicly. */}
                {(() => {
                  const creator =
                    listing.createdByName ??
                    (listing.createdBy
                      ? employeeNames[listing.createdBy]
                      : null);
                  if (!creator) return null;
                  return (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">
                        {t("listings.publishedBy", { name: creator })}
                      </span>
                    </p>
                  );
                })()}

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
