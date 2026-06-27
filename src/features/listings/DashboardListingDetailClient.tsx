"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
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

interface MediaItem {
  url: string;
  path: string;
  type: "image" | "video";
  order: number;
  alt?: string;
  isCover?: boolean;
}

interface ListingDetail {
  title: string;
  description: string;
  descriptionAr?: string;
  type: ListingType;
  category: ListingCategory;
  price: number;
  currency: string;
  priceNegotiable?: boolean;
  rentPeriod?: string;
  status: ListingStatus;
  featured: boolean;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  areaUnit?: string;
  yearBuilt?: number;
  floorNumber?: number;
  totalFloors?: number;
  location: Record<string, unknown>;
  amenities: Record<string, unknown>;
  details: Record<string, unknown>;
  contacts: Record<string, unknown>[];
  analytics: Record<string, unknown>;
  assignedEmployeeName?: string;
  media: MediaItem[];
  createdAt: Date | null;
  updatedAt: Date | null;
  publishedAt: Date | null;
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

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseMedia(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => ({
      url: typeof item.url === "string" ? item.url : "",
      path: typeof item.path === "string" ? item.path : "",
      type: item.type === "video" ? ("video" as const) : ("image" as const),
      order: typeof item.order === "number" ? item.order : index,
      alt: typeof item.alt === "string" ? item.alt : undefined,
      isCover: Boolean(item.isCover),
    }))
    .filter((item) => item.url.length > 0)
    .sort((a, b) => a.order - b.order);
}

function mapDetail(data: DocumentData): ListingDetail {
  return {
    title: str(data.title) ?? t("listings.untitled"),
    description: str(data.description) ?? "",
    descriptionAr: str(data.descriptionAr),
    type: (data.type as ListingType) ?? LISTING_TYPES.SALE,
    category: (data.category as ListingCategory) ?? LISTING_CATEGORIES.APARTMENT,
    price: num(data.price) ?? 0,
    currency: str(data.currency) ?? "SAR",
    priceNegotiable: Boolean(data.priceNegotiable),
    rentPeriod: str(data.rentPeriod),
    status: (data.status as ListingStatus) ?? LISTING_STATUSES.DRAFT,
    featured: Boolean(data.featured),
    bedrooms: num(data.bedrooms),
    bathrooms: num(data.bathrooms),
    area: num(data.area),
    areaUnit: str(data.areaUnit),
    yearBuilt: num(data.yearBuilt),
    floorNumber: num(data.floorNumber),
    totalFloors: num(data.totalFloors),
    location:
      typeof data.location === "object" && data.location !== null
        ? (data.location as Record<string, unknown>)
        : {},
    amenities:
      typeof data.amenities === "object" && data.amenities !== null
        ? (data.amenities as Record<string, unknown>)
        : {},
    details:
      typeof data.details === "object" && data.details !== null
        ? (data.details as Record<string, unknown>)
        : {},
    contacts: Array.isArray(data.contacts)
      ? (data.contacts.filter(
          (c) => typeof c === "object" && c !== null,
        ) as Record<string, unknown>[])
      : [],
    analytics:
      typeof data.analytics === "object" && data.analytics !== null
        ? (data.analytics as Record<string, unknown>)
        : {},
    assignedEmployeeName: str(data.assignedEmployeeName),
    media: parseMedia(data.media),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    publishedAt: toDate(data.publishedAt),
  };
}

const AMENITY_LABELS: Record<string, string> = {
  parking: t("listings.amenityParking"),
  furnished: t("listings.amenityFurnished"),
  balcony: t("listings.amenityBalcony"),
  garden: t("listings.amenityGarden"),
  pool: t("listings.amenityPool"),
  gym: t("listings.amenityGym"),
  security: t("listings.amenitySecurity"),
  elevator: t("listings.amenityElevator"),
  ac: t("listings.amenityAc"),
  heating: t("listings.amenityHeating"),
  petFriendly: t("listings.amenityPetFriendly"),
};

// Deed/registry fields rendered in this order when present.
const DEED_FIELDS: { key: string; label: string }[] = [
  { key: "usageType", label: t("listings.deedUsageType") },
  { key: "propertyTypeName", label: t("listings.deedPropertyTypeName") },
  { key: "propertyNumber", label: t("listings.deedPropertyNumber") },
  { key: "titleEn", label: t("listings.deedTitleEn") },
  { key: "deedType", label: t("listings.deedType") },
  { key: "deedNumber", label: t("listings.deedNumber") },
  { key: "deedIssueDate", label: t("listings.deedIssueDate") },
  { key: "propertyArea", label: t("listings.deedPropertyArea") },
  { key: "additionalNumber1", label: t("listings.deedAdditionalNumber1") },
  { key: "additionalNumber2", label: t("listings.deedAdditionalNumber2") },
  { key: "parcelNumber", label: t("listings.deedParcelNumber") },
  { key: "blockNumber", label: t("listings.deedBlockNumber") },
  { key: "buildDate", label: t("listings.deedBuildDate") },
  { key: "floorsCount", label: t("listings.deedFloorsCount") },
  { key: "unitsPerFloor", label: t("listings.deedUnitsPerFloor") },
  {
    key: "electricityMeterNumber",
    label: t("listings.deedElectricityMeterNumber"),
  },
  {
    key: "electricitySubscriptionNumber",
    label: t("listings.deedElectricitySubscriptionNumber"),
  },
  { key: "waterMeterNumber", label: t("listings.deedWaterMeterNumber") },
  {
    key: "waterSubscriptionNumber",
    label: t("listings.deedWaterSubscriptionNumber"),
  },
  { key: "streetName", label: t("listings.deedStreetName") },
  { key: "postalCode", label: t("listings.deedPostalCode") },
  { key: "buildingNumber", label: t("listings.deedBuildingNumber") },
  { key: "deedReference", label: t("listings.deedDeedReference") },
  { key: "paymentCycle", label: t("listings.deedPaymentCycle") },
  { key: "deposit", label: t("listings.deedDeposit") },
];

function rentPeriodLabel(period?: string): string | undefined {
  if (period === "monthly") return t("listings.rentMonthly");
  if (period === "yearly") return t("listings.rentYearly");
  if (period === "daily") return t("listings.rentDaily");
  return period;
}

interface DashboardListingDetailClientProps {
  companyId: string;
  listingId: string;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

export function DashboardListingDetailClient({
  companyId,
  listingId,
  canEdit,
  canDelete,
  canPublish,
}: DashboardListingDetailClientProps) {
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);

  const { user: authUser, loading: authLoading } = useAuth();
  const authReady = !authLoading && Boolean(authUser);

  useEffect(() => {
    if (!authReady) return;

    const db = getFirebaseDb();
    const docRef = doc(db, `companies/${companyId}/listings/${listingId}`);

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setListing(null);
        } else {
          setListing(mapDetail(snap.data()));
          setNotFound(false);
        }
        setLoading(false);
        setError(null);
      },
      (snapError) => {
        setError(snapError.message);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [companyId, listingId, authReady]);

  const media = listing?.media ?? [];
  const selected = media[activeMedia] ?? media[0];

  const amenityEntries = useMemo(() => {
    if (!listing) return [] as { label: string; value: string }[];
    return Object.entries(listing.amenities)
      .filter(([, v]) => v === true || (typeof v === "number" && v > 0))
      .map(([k, v]) => ({
        label: AMENITY_LABELS[k] ?? k,
        value: typeof v === "number" ? String(v) : t("common.yes"),
      }));
  }, [listing]);

  const deedEntries = useMemo(() => {
    if (!listing) return [] as { label: string; value: string }[];
    return DEED_FIELDS.map(({ key, label }) => {
      const raw = listing.details[key];
      if (raw === undefined || raw === null || raw === "") return null;
      return { label, value: String(raw) };
    }).filter((x): x is { label: string; value: string } => x !== null);
  }, [listing]);

  async function setStatus(status: ListingStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/listings/${listingId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? t("listings.statusUpdateFailed"));
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("listings.statusUpdateFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeatured() {
    if (!listing) return;
    setBusy(true);
    setError(null);
    try {
      const db = getFirebaseDb();
      await updateDoc(doc(db, `companies/${companyId}/listings/${listingId}`), {
        featured: !listing.featured,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("listings.featuredToggleFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeListing() {
    if (!window.confirm(t("listings.deleteConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, `companies/${companyId}/listings/${listingId}`));
      router.push(ROUTES.DASHBOARD_LISTINGS);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("listings.deleteFailed"));
      setBusy(false);
    }
  }

  async function uploadMediaFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadBusy(true);
    setError(null);
    try {
      const storage = getFirebaseStorage();
      const files = Array.from(fileList);
      const startCount = media.length;

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        const cleanName = file.name
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, "-")
          .replace(/-+/g, "-");
        const objectPath =
          `companies/${companyId}/listings/${listingId}/` +
          `${Date.now()}-${index}-${cleanName}`;

        const objectRef = ref(storage, objectPath);
        await uploadBytes(objectRef, file, {
          contentType: file.type || undefined,
        });
        const downloadUrl = await getDownloadURL(objectRef);
        const mediaType = file.type.startsWith("video/") ? "video" : "image";

        const res = await fetch(
          `/api/companies/${companyId}/listings/${listingId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: downloadUrl,
              path: objectPath,
              type: mediaType,
              alt: file.name,
              isCover: startCount === 0 && index === 0,
            }),
          },
        );
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(payload.error || t("listings.mediaRegisterFailed"));
        }
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("listings.mediaUploadFailed"),
      );
    } finally {
      setUploadBusy(false);
    }
  }

  async function setCover(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/listings/${listingId}/media/cover`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        },
      );
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || t("listings.coverUpdateFailed"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("listings.coverUpdateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function removeMedia(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/listings/${listingId}/media`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, deleteFromStorage: true }),
        },
      );
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || t("listings.mediaRemoveFailed"));
      }
      setActiveMedia(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("listings.mediaRemoveFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        {t("listings.loadingDetail")}
      </p>
    );
  }

  if (notFound || !listing) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        {t("listings.detailNotFound")}
      </p>
    );
  }

  const isPublished = listing.status === LISTING_STATUSES.PUBLISHED;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Header + actions */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {listing.title}
              </h2>
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-semibold",
                  isPublished
                    ? "bg-success/20 text-success"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {LISTING_STATUS_LABELS[listing.status].ar}
              </span>
              {listing.featured && (
                <span className="rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
                  ★ {t("listings.feature")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {LISTING_TYPE_LABELS[listing.type].ar} •{" "}
              {LISTING_CATEGORY_LABELS[listing.category].ar} •{" "}
              {str(listing.location.city) ?? t("listings.unknownCity")}
            </p>
            <div className="text-xl font-bold text-foreground">
              <SARPrice amount={listing.price} />
              {listing.rentPeriod && (
                <span className="ms-1 text-sm font-normal text-muted-foreground">
                  / {rentPeriodLabel(listing.rentPeriod)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canPublish && !isPublished && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus(LISTING_STATUSES.PUBLISHED)}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {t("listings.publish")}
              </button>
            )}
            {canEdit && isPublished && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus(LISTING_STATUSES.DRAFT)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
              >
                {t("listings.draft")}
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                disabled={busy}
                onClick={toggleFeatured}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
              >
                {listing.featured
                  ? t("listings.unfeature")
                  : t("listings.feature")}
              </button>
            )}
            {canEdit && (
              <Link
                href={ROUTES.DASHBOARD_LISTING_EDIT(listingId)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                {t("listings.editListing")}
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                disabled={busy}
                onClick={removeListing}
                className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {t("common.delete")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Media gallery */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold">
          {t("listings.sectionGallery")}
        </h3>

        <div className="mt-4">
          {media.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-background px-3 py-6 text-center text-sm text-muted-foreground">
              {t("listings.noMedia")}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="relative h-72 w-full overflow-hidden rounded-xl bg-secondary md:h-96">
                {selected?.type === "video" ? (
                  <video
                    src={selected.url}
                    className="h-full w-full object-contain"
                    controls
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected?.url}
                    alt={selected?.alt || listing.title}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {media.map((item, index) => (
                  <div key={item.path || item.url} className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMedia(index)}
                      className={cn(
                        "h-16 w-20 overflow-hidden rounded-md border bg-secondary transition",
                        index === activeMedia
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.alt || ""}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                    {item.isCover && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-success/90 px-1 text-[10px] font-semibold text-success-foreground">
                        {t("listings.cover")}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {canEdit && selected && (
                <div className="flex flex-wrap gap-2">
                  {!selected.isCover && selected.path && (
                    <button
                      type="button"
                      disabled={busy || uploadBusy}
                      onClick={() => setCover(selected.path)}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                    >
                      {t("listings.setCover")}
                    </button>
                  )}
                  {selected.path && (
                    <button
                      type="button"
                      disabled={busy || uploadBusy}
                      onClick={() => removeMedia(selected.path)}
                      className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {t("listings.remove")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {canEdit && (
            <div className="mt-4 rounded-md border border-dashed border-border p-4">
              <label className="block text-sm font-medium">
                {t("listings.uploadFiles")}
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("listings.uploadHint")}
              </p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                disabled={uploadBusy || busy}
                onChange={(event) => {
                  void uploadMediaFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
                className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
              />
              {(uploadBusy || busy) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {uploadBusy
                    ? t("listings.uploadingMedia")
                    : t("listings.updatingMedia")}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Overview */}
      <Section title={t("listings.sectionOverview")}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
          {listing.description || listing.descriptionAr || t("listings.noDescription")}
        </p>
      </Section>

      {/* Key specs */}
      <Section title={t("listings.sectionSpecs")}>
        <InfoGrid
          rows={[
            { label: t("listings.specBedrooms"), value: listing.bedrooms },
            { label: t("listings.specBathrooms"), value: listing.bathrooms },
            {
              label: t("listings.specArea"),
              value:
                listing.area !== undefined
                  ? `${listing.area} ${
                      listing.areaUnit === "sqft"
                        ? t("listings.unitSqft")
                        : t("listings.unitSqm")
                    }`
                  : undefined,
            },
            { label: t("listings.specYearBuilt"), value: listing.yearBuilt },
            { label: t("listings.specFloorNumber"), value: listing.floorNumber },
            { label: t("listings.specTotalFloors"), value: listing.totalFloors },
            {
              label: t("listings.specRentPeriod"),
              value: rentPeriodLabel(listing.rentPeriod),
            },
            {
              label: t("listings.specNegotiable"),
              value: listing.priceNegotiable ? t("common.yes") : undefined,
            },
          ]}
        />
      </Section>

      {/* Location */}
      <Section title={t("listings.sectionLocation")}>
        <InfoGrid
          rows={[
            { label: t("common.country"), value: str(listing.location.country) },
            { label: t("listings.locRegion"), value: str(listing.location.region) },
            { label: t("common.city"), value: str(listing.location.city) },
            {
              label: t("listings.locDistrict"),
              value: str(listing.location.district),
            },
            {
              label: t("listings.locAddress"),
              value: str(listing.location.address),
            },
            {
              label: t("listings.locCoordinates"),
              value:
                num(listing.location.lat) !== undefined &&
                num(listing.location.lng) !== undefined
                  ? `${listing.location.lat}, ${listing.location.lng}`
                  : undefined,
            },
          ]}
        />
      </Section>

      {/* Amenities */}
      {amenityEntries.length > 0 && (
        <Section title={t("listings.sectionAmenities")}>
          <div className="flex flex-wrap gap-2">
            {amenityEntries.map((a) => (
              <span
                key={a.label}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {a.label}
                {a.value !== t("common.yes") ? `: ${a.value}` : ""}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Deed / registry details */}
      {deedEntries.length > 0 && (
        <Section title={t("listings.sectionDeed")}>
          <InfoGrid rows={deedEntries} />
        </Section>
      )}

      {/* Contacts */}
      {listing.contacts.length > 0 && (
        <Section title={t("listings.sectionContacts")}>
          <div className="space-y-3">
            {listing.contacts.map((c, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-background p-3 text-sm"
              >
                <p className="font-medium text-foreground">
                  {str(c.name) ?? "-"}
                  {str(c.role) ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {str(c.role)}
                    </span>
                  ) : null}
                </p>
                {str(c.phone) && (
                  <p className="text-muted-foreground">
                    {t("listings.contactPhone")}: {str(c.phone)}
                  </p>
                )}
                {str(c.note) && (
                  <p className="text-muted-foreground">
                    {t("listings.contactNote")}: {str(c.note)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Analytics */}
      <Section title={t("listings.sectionAnalytics")}>
        <InfoGrid
          rows={[
            { label: t("listings.analyticsViews"), value: num(listing.analytics.views) ?? 0 },
            {
              label: t("listings.analyticsUniqueViews"),
              value: num(listing.analytics.uniqueViews) ?? 0,
            },
            {
              label: t("listings.analyticsInquiries"),
              value: num(listing.analytics.inquiries) ?? 0,
            },
            {
              label: t("listings.analyticsWhatsapp"),
              value: num(listing.analytics.whatsappClicks) ?? 0,
            },
            {
              label: t("listings.analyticsPhone"),
              value: num(listing.analytics.phoneClicks) ?? 0,
            },
            {
              label: t("listings.analyticsFavorites"),
              value: num(listing.analytics.favorites) ?? 0,
            },
          ]}
        />
      </Section>

      {/* Meta */}
      <Section title={t("listings.sectionMeta")}>
        <InfoGrid
          rows={[
            {
              label: t("listings.metaAssignedEmployee"),
              value:
                listing.assignedEmployeeName ?? t("listings.metaUnassigned"),
            },
            {
              label: t("listings.metaCreatedAt"),
              value: listing.createdAt ? formatDate(listing.createdAt) : "-",
            },
            {
              label: t("listings.metaUpdatedAt"),
              value: listing.updatedAt ? formatDate(listing.updatedAt) : "-",
            },
            {
              label: t("listings.metaPublishedAt"),
              value: listing.publishedAt
                ? formatDate(listing.publishedAt)
                : t("listings.metaNotPublished"),
            },
          ]}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoGrid({
  rows,
}: {
  rows: { label: string; value: string | number | undefined }[];
}) {
  const visible = rows.filter(
    (r) => r.value !== undefined && r.value !== "" && r.value !== null,
  );
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((r) => (
        <div key={r.label} className="flex flex-col">
          <dt className="text-xs text-muted-foreground">{r.label}</dt>
          <dd className="text-sm font-medium text-foreground">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
