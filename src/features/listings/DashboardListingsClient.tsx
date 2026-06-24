"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
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
  updatedAt: Date | null;
}

interface ListingMediaRow {
  url: string;
  path: string;
  type: "image" | "video";
  order: number;
  alt?: string;
  isCover?: boolean;
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
    updatedAt: toDate(data.updatedAt),
  };
}

function parseMediaRows(value: unknown): ListingMediaRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => {
      const type: ListingMediaRow["type"] =
        item.type === "video" ? "video" : "image";

      return {
        url: typeof item.url === "string" ? item.url : "",
        path: typeof item.path === "string" ? item.path : "",
        type,
        order: typeof item.order === "number" ? item.order : index,
        alt: typeof item.alt === "string" ? item.alt : undefined,
        isCover: Boolean(item.isCover),
      };
    })
    .filter((item) => item.url.length > 0 && item.path.length > 0)
    .sort((a, b) => a.order - b.order);
}

interface DashboardListingsClientProps {
  companyId: string;
  userId: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

export function DashboardListingsClient({
  companyId,
  canEdit,
  canDelete,
  canPublish,
}: DashboardListingsClientProps) {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mediaTarget, setMediaTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [mediaItems, setMediaItems] = useState<ListingMediaRow[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  // Firestore Security Rules check `request.auth` (companyId claim). On a cold
  // page load the listener can attach before Firebase Auth restores the user,
  // which sends the read unauthenticated and trips "Missing or insufficient
  // permissions". Gate the subscription on auth being ready.
  const { user: authUser, loading: authLoading } = useAuth();
  const authReady = !authLoading && Boolean(authUser);

  useEffect(() => {
    if (!authReady) return;

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
  }, [companyId, authReady]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return listings;
    return listings.filter((l) => l.status === statusFilter);
  }, [listings, statusFilter]);

  async function setStatus(id: string, status: ListingStatus) {
    if (!canEdit) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/listings/${id}/status`,
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
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : t("listings.statusUpdateFailed");
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFeatured(id: string, featured: boolean) {
    if (!canEdit) return;
    setBusyId(id);
    setError(null);
    try {
      const db = getFirebaseDb();
      const ref = doc(db, `companies/${companyId}/listings/${id}`);
      await updateDoc(ref, {
        featured: !featured,
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : t("listings.featuredToggleFailed");
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeListing(id: string) {
    if (!canDelete) return;
    const confirmed = window.confirm(t("listings.deleteConfirm"));
    if (!confirmed) return;

    setBusyId(id);
    setError(null);
    try {
      const db = getFirebaseDb();
      const ref = doc(db, `companies/${companyId}/listings/${id}`);
      await deleteDoc(ref);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : t("listings.deleteFailed");
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function loadListingMedia(listingId: string) {
    setMediaLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/listings/${listingId}/media`,
      );
      const payload = (await response.json()) as {
        media?: unknown;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || t("listings.mediaLoadFailed"));
      }

      setMediaItems(parseMediaRows(payload.media));
    } catch (mediaError) {
      setError(
        mediaError instanceof Error
          ? mediaError.message
          : t("listings.mediaLoadFailed"),
      );
    } finally {
      setMediaLoading(false);
    }
  }

  async function openMediaManager(listing: ListingRow) {
    setMediaTarget({ id: listing.id, title: listing.title });
    await loadListingMedia(listing.id);
  }

  async function uploadMediaFiles(fileList: FileList | null) {
    if (!mediaTarget || !fileList || fileList.length === 0) {
      return;
    }

    setUploadBusy(true);
    setError(null);

    try {
      const storage = getFirebaseStorage();
      const files = Array.from(fileList);

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        const cleanName = file.name
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, "-")
          .replace(/-+/g, "-");

        const objectPath =
          `companies/${companyId}/listings/${mediaTarget.id}/` +
          `${Date.now()}-${index}-${cleanName}`;

        const objectRef = ref(storage, objectPath);
        await uploadBytes(objectRef, file, {
          contentType: file.type || undefined,
        });

        const downloadUrl = await getDownloadURL(objectRef);
        const mediaType = file.type.startsWith("video/") ? "video" : "image";

        const createResponse = await fetch(
          `/api/companies/${companyId}/listings/${mediaTarget.id}/media`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: downloadUrl,
              path: objectPath,
              type: mediaType,
              alt: file.name,
              isCover: mediaItems.length === 0 && index === 0,
            }),
          },
        );

        const createPayload = (await createResponse.json()) as {
          error?: string;
        };
        if (!createResponse.ok) {
          throw new Error(
            createPayload.error || t("listings.mediaRegisterFailed"),
          );
        }
      }

      await loadListingMedia(mediaTarget.id);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("listings.mediaUploadFailed"),
      );
    } finally {
      setUploadBusy(false);
    }
  }

  async function setCover(path: string) {
    if (!mediaTarget) return;

    setMediaBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/listings/${mediaTarget.id}/media/cover`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || t("listings.coverUpdateFailed"));
      }

      await loadListingMedia(mediaTarget.id);
    } catch (coverError) {
      setError(
        coverError instanceof Error
          ? coverError.message
          : t("listings.coverUpdateFailed"),
      );
    } finally {
      setMediaBusy(false);
    }
  }

  async function removeMedia(path: string) {
    if (!mediaTarget) return;

    setMediaBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/listings/${mediaTarget.id}/media`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path,
            deleteFromStorage: true,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || t("listings.mediaRemoveFailed"));
      }

      await loadListingMedia(mediaTarget.id);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : t("listings.mediaRemoveFailed"),
      );
    } finally {
      setMediaBusy(false);
    }
  }

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

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("listings.colListing")}</th>
                <th className="px-4 py-3">{t("listings.colType")}</th>
                <th className="px-4 py-3">{t("listings.colPrice")}</th>
                <th className="px-4 py-3">{t("listings.colStatus")}</th>
                <th className="px-4 py-3">{t("listings.colUpdated")}</th>
                <th className="px-4 py-3">{t("listings.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={6}>
                    {t("listings.loadingListings")}
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                    {t("listings.noMatch")}
                  </td>
                </tr>
              )}

              {filtered.map((listing) => {
                const isBusy = busyId === listing.id;
                return (
                  <tr key={listing.id}>
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">
                        {listing.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {listing.city} •{" "}
                        {LISTING_CATEGORY_LABELS[listing.category].ar} •{" "}
                        {t("listings.mediaCount", {
                          count: listing.mediaCount,
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {LISTING_TYPE_LABELS[listing.type].ar}
                    </td>
                    <td className="px-4 py-4 font-medium">
                      <SARPrice amount={listing.price} />
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-semibold",
                          listing.status === LISTING_STATUSES.PUBLISHED
                            ? "bg-success/20 text-success"
                            : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {LISTING_STATUS_LABELS[listing.status].ar}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {listing.updatedAt ? formatDate(listing.updatedAt) : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {canPublish &&
                          listing.status !== LISTING_STATUSES.PUBLISHED && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                setStatus(
                                  listing.id,
                                  LISTING_STATUSES.PUBLISHED,
                                )
                              }
                              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                            >
                              {t("listings.publish")}
                            </button>
                          )}
                        {canEdit &&
                          listing.status === LISTING_STATUSES.PUBLISHED && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                setStatus(listing.id, LISTING_STATUSES.DRAFT)
                              }
                              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                            >
                              {t("listings.draft")}
                            </button>
                          )}
                        {canEdit && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openMediaManager(listing)}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                          >
                            {t("listings.media")}
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              toggleFeatured(listing.id, listing.featured)
                            }
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                          >
                            {listing.featured
                              ? t("listings.unfeature")
                              : t("listings.feature")}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => removeListing(listing.id)}
                            className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {t("common.delete")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {mediaTarget && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold">
                {t("listings.manageMedia")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {mediaTarget.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMediaTarget(null);
                setMediaItems([]);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              {t("common.close")}
            </button>
          </div>

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
              disabled={uploadBusy || mediaBusy}
              onChange={(event) => {
                void uploadMediaFiles(event.target.files);
                event.currentTarget.value = "";
              }}
              className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
            />
            {(uploadBusy || mediaBusy) && (
              <p className="mt-2 text-xs text-muted-foreground">
                {uploadBusy
                  ? t("listings.uploadingMedia")
                  : t("listings.updatingMedia")}
              </p>
            )}
          </div>

          <div className="mt-4">
            {mediaLoading ? (
              <p className="text-sm text-muted-foreground">
                {t("listings.loadingMedia")}
              </p>
            ) : mediaItems.length === 0 ? (
              <p className="rounded-md border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                {t("listings.noMedia")}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {mediaItems.map((item) => (
                  <article
                    key={item.path}
                    className="overflow-hidden rounded-xl border border-border bg-background"
                  >
                    <div className="h-40 w-full bg-secondary">
                      {item.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.alt || t("listings.listingMedia")}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          src={item.url}
                          className="h-full w-full object-cover"
                          controls
                        />
                      )}
                    </div>

                    <div className="space-y-2 p-3">
                      <p className="truncate text-xs text-muted-foreground">
                        {item.path}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            "rounded-md px-2 py-1 text-xs font-semibold",
                            item.isCover
                              ? "bg-success/20 text-success"
                              : "bg-secondary text-secondary-foreground",
                          )}
                        >
                          {item.isCover ? t("listings.cover") : item.type}
                        </span>
                        {!item.isCover && (
                          <button
                            type="button"
                            disabled={mediaBusy || uploadBusy}
                            onClick={() => setCover(item.path)}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                          >
                            {t("listings.setCover")}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={mediaBusy || uploadBusy}
                          onClick={() => removeMedia(item.path)}
                          className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {t("listings.remove")}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

