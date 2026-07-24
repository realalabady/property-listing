"use client";

import Link from "next/link";
import { MapPin, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { ListingUnitsManager } from "./ListingUnitsManager";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  coerceListingCategory,
  coerceListingStatus,
  coerceListingType,
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
import { DiscountedPrice } from "@/components/ui/DiscountedPrice";
import { AuctionPanel } from "./AuctionPanel";
import { PERMISSIONS, hasPermission } from "@/constants/permissions";
import { t } from "@/lib/i18n";

interface MediaItem {
  url: string;
  path: string;
  type: "image" | "video";
  order: number;
  alt?: string;
  isCover?: boolean;
}

/** Denormalized auction summary read off the listing doc (audit name kept). */
export interface AuctionSummary {
  enabled: boolean;
  status: "open" | "closed";
  startPrice: number;
  minIncrement: number;
  currentBid: number | null;
  bidCount: number;
  highBidByEmployeeName: string | null;
  endsAt: number | null;
}

function parseAuctionSummary(value: unknown): AuctionSummary | null {
  if (typeof value !== "object" || value === null) return null;
  const a = value as Record<string, unknown>;
  if (a.enabled !== true) return null;
  return {
    enabled: true,
    status: a.status === "closed" ? "closed" : "open",
    startPrice: typeof a.startPrice === "number" ? a.startPrice : 0,
    minIncrement: typeof a.minIncrement === "number" ? a.minIncrement : 0,
    currentBid: typeof a.currentBid === "number" ? a.currentBid : null,
    bidCount: typeof a.bidCount === "number" ? a.bidCount : 0,
    highBidByEmployeeName:
      typeof a.highBidByEmployeeName === "string"
        ? a.highBidByEmployeeName
        : null,
    endsAt: typeof a.endsAt === "number" ? a.endsAt : null,
  };
}

interface ListingDetail {
  title: string;
  description: string;
  descriptionAr?: string;
  type: ListingType;
  category: ListingCategory;
  price: number;
  discount?: number;
  currency: string;
  priceNegotiable?: boolean;
  rentPeriod?: string;
  status: ListingStatus;
  featured: boolean;
  /** Live auction summary (from the same listing snapshot). Null = none. */
  auction: AuctionSummary | null;
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
  hasPrivateData: boolean;
  source: "owner" | "broker";
  brokerInfo: Record<string, unknown> | null;
  publishedOn: Record<string, boolean>;
  unitsSummary: { total: number; available: number } | null;
  publicUnitsCount: number;
  analytics: Record<string, unknown>;
  assignedEmployeeName?: string;
  /** uid of the employee who created/published the listing (internal only). */
  createdBy?: string;
  /** Denormalized creator name when present; else resolved from the roster. */
  createdByName?: string;
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
    type: coerceListingType(data.type),
    category: coerceListingCategory(data.category),
    price: num(data.price) ?? 0,
    discount: num(data.discount) ?? 0,
    currency: str(data.currency) ?? "SAR",
    priceNegotiable: Boolean(data.priceNegotiable),
    rentPeriod: str(data.rentPeriod),
    status: coerceListingStatus(data.status),
    featured: Boolean(data.featured),
    auction: parseAuctionSummary(data.auction),
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
    hasPrivateData: data.hasPrivateData === true,
    source: data.source === "broker" ? "broker" : "owner",
    brokerInfo:
      typeof data.brokerInfo === "object" && data.brokerInfo !== null
        ? (data.brokerInfo as Record<string, unknown>)
        : null,
    publishedOn:
      typeof data.publishedOn === "object" && data.publishedOn !== null
        ? (data.publishedOn as Record<string, boolean>)
        : {},
    unitsSummary:
      typeof data.unitsSummary === "object" && data.unitsSummary !== null
        ? {
            total:
              typeof (data.unitsSummary as Record<string, unknown>).total ===
              "number"
                ? ((data.unitsSummary as Record<string, number>).total as number)
                : 0,
            available:
              typeof (data.unitsSummary as Record<string, unknown>)
                .available === "number"
                ? ((data.unitsSummary as Record<string, number>)
                    .available as number)
                : 0,
          }
        : null,
    publicUnitsCount: Array.isArray(data.publicUnits)
      ? data.publicUnits.length
      : 0,
    analytics:
      typeof data.analytics === "object" && data.analytics !== null
        ? (data.analytics as Record<string, unknown>)
        : {},
    assignedEmployeeName: str(data.assignedEmployeeName),
    createdBy: str(data.createdBy),
    createdByName: str(data.createdByName),
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
  { key: "planNumber", label: t("listings.deedPlanNumber") },
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
  { key: "brokerageContract", label: t("listings.deedBrokerageContract") },
  { key: "paymentCycle", label: t("listings.deedPaymentCycle") },
  { key: "deposit", label: t("listings.deedDeposit") },
];

const PUBLISH_PLATFORMS: Array<{ key: string; label: string }> = [
  { key: "aqar", label: "منصة عقار" },
  { key: "instagram", label: "انستقرام" },
  { key: "x", label: "إكس (تويتر)" },
  { key: "facebook", label: "فيسبوك" },
  { key: "snapchat", label: "سناب شات" },
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
  // manage_bids holders, or anyone who can already edit this listing
  // (owner/creator/editors) — mirrors the API guard so controls show before
  // the new permission propagates into token claims.
  const canManageBids =
    canEdit || hasPermission(authUser?.permissions, PERMISSIONS.MANAGE_BIDS);

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

  // Protected owner/deed subdoc: readable only by super admins, the listing
  // creator, or members with `view_owner_info` (firestore rules). A denied
  // read just means the viewer isn't authorized — render nothing, no error.
  const [privateData, setPrivateData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const hasPrivate = listing?.hasPrivateData === true;
  useEffect(() => {
    if (!authReady || !hasPrivate) {
      setPrivateData(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(
          doc(
            getFirebaseDb(),
            `companies/${companyId}/listings/${listingId}/private/data`,
          ),
        );
        if (mounted && snap.exists()) {
          setPrivateData(snap.data() as Record<string, unknown>);
        }
      } catch {
        // Permission denied — viewer isn't allowed to see owner/deed data.
        if (mounted) setPrivateData(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authReady, hasPrivate, companyId, listingId]);

  // Who published this listing. Prefer the denormalized name; for older
  // listings that only stored `createdBy`, resolve the uid against the employee
  // roster. A denied/missing read just leaves the uid-less fallback.
  const [publisherName, setPublisherName] = useState<string | null>(null);
  const createdBy = listing?.createdBy ?? null;
  const createdByName = listing?.createdByName ?? null;
  useEffect(() => {
    if (createdByName) {
      setPublisherName(createdByName);
      return;
    }
    if (!authReady || !createdBy) {
      setPublisherName(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(
          doc(getFirebaseDb(), `companies/${companyId}/employees/${createdBy}`),
        );
        const name = snap.exists() ? snap.get("name") : null;
        if (mounted) {
          setPublisherName(typeof name === "string" && name ? name : null);
        }
      } catch {
        if (mounted) setPublisherName(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authReady, companyId, createdBy, createdByName]);

  // Contact of the employee SENDING the offer (the signed-in agent), so the
  // WhatsApp pitch carries their own name + phone instead of the caretaker's.
  const [agentContact, setAgentContact] = useState<{
    name: string;
    phone: string;
  } | null>(null);
  const agentUid = authUser?.uid ?? null;

  // Deed number (رقم الصك) and the publishing employee are confidential: only
  // the offer's creator and viewers allowed to read the protected subdoc
  // (super admin / members with `view_owner_info`) may see them. `privateData`
  // is non-null only when that gated read succeeded; the uid check also covers
  // the creator on legacy listings that have no private subdoc.
  const canViewConfidential =
    privateData !== null || (agentUid !== null && agentUid === createdBy);
  useEffect(() => {
    if (!authReady || !agentUid) {
      setAgentContact(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(
          doc(getFirebaseDb(), `companies/${companyId}/employees/${agentUid}`),
        );
        if (!mounted) return;
        const name = snap.exists() ? snap.get("name") : null;
        const phone = snap.exists() ? snap.get("phone") : null;
        setAgentContact({
          name: typeof name === "string" ? name : "",
          phone: typeof phone === "string" ? phone : "",
        });
      } catch {
        if (mounted) setAgentContact(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authReady, companyId, agentUid]);

  const privateOwner = useMemo(() => {
    const owner =
      privateData &&
      typeof privateData.owner === "object" &&
      privateData.owner !== null
        ? (privateData.owner as Record<string, unknown>)
        : {};
    const rows: { label: string; value: string }[] = [];
    const push = (label: string, value: unknown) => {
      if (typeof value === "string" && value.trim())
        rows.push({ label, value });
    };
    push(t("listings.ownerName"), owner.name);
    push(t("listings.ownerPhone"), owner.phone);
    push(t("listings.ownerNationalId"), owner.nationalId);
    push(t("listings.ownerNote"), owner.note);
    return rows;
  }, [privateData]);

  const privateContacts = useMemo(() => {
    return privateData && Array.isArray(privateData.restrictedContacts)
      ? (privateData.restrictedContacts.filter(
          (c) => typeof c === "object" && c !== null,
        ) as Record<string, unknown>[])
      : [];
  }, [privateData]);

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
    // New-style listings keep deed fields in the protected subdoc; legacy
    // listings keep them in `details`. Private values win when both exist.
    const privateDeed =
      privateData &&
      typeof privateData.deed === "object" &&
      privateData.deed !== null
        ? (privateData.deed as Record<string, unknown>)
        : {};
    return DEED_FIELDS.map(({ key, label }) => {
      // Never fall back to the public `details` copy for unauthorized viewers —
      // that main-doc field is readable by every employee, which would leak the
      // deed number. Only authorized viewers see the legacy `details` fallback.
      const raw =
        privateDeed[key] ??
        (canViewConfidential ? listing.details[key] : undefined);
      if (raw === undefined || raw === null || raw === "") return null;
      return { label, value: String(raw) };
    }).filter((x): x is { label: string; value: string } => x !== null);
  }, [listing, privateData, canViewConfidential]);

  const mapsHref = useMemo(() => {
    const lat = num(listing?.location.lat);
    const lng = num(listing?.location.lng);
    if (lat === undefined || lng === undefined) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }, [listing]);

  /**
   * WhatsApp offer (note 7): builds the whole property pitch so the employee
   * never has to copy/paste it by hand. The caretaker phone is included ONLY
   * when this viewer is actually allowed to see it (restricted phones live in
   * the private subdoc, so `privateContacts` is empty when they're not).
   * The public link is only added once the listing is published.
   */
  const whatsappHref = useMemo(() => {
    if (!listing) return null;

    const lines: string[] = [];
    lines.push(`*${listing.title}*`);
    if (listing.description) lines.push(listing.description);

    const specs: string[] = [];
    const price = num(listing.price);
    if (price !== undefined) {
      const period = rentPeriodLabel(listing.rentPeriod);
      specs.push(
        `${t("listings.price")}: ${price.toLocaleString("en-US")} ${t("units.sar")}${
          period ? ` / ${period}` : ""
        }`,
      );
    }
    const city = str(listing.location.city);
    const district = str(listing.location.district);
    if (city || district) {
      specs.push(
        `${t("common.city")}: ${[city, district].filter(Boolean).join(" - ")}`,
      );
    }
    if (listing.area) specs.push(`${t("listings.areaSqm")}: ${listing.area}`);
    if (listing.bedrooms != null)
      specs.push(`${t("units.bedrooms")}: ${listing.bedrooms}`);
    if (listing.bathrooms != null)
      specs.push(`${t("units.bathrooms")}: ${listing.bathrooms}`);
    if (listing.unitsSummary && listing.unitsSummary.total > 0) {
      specs.push(
        t("units.availableOfTotal", {
          available: listing.unitsSummary.available,
          total: listing.unitsSummary.total,
        }),
      );
    }
    if (specs.length > 0) lines.push("", ...specs);

    if (mapsHref) lines.push("", `${t("listings.openInGoogleMaps")}: ${mapsHref}`);

    // The agent's own contact — replaces the (secret) caretaker phone.
    if (agentContact && (agentContact.name || agentContact.phone)) {
      lines.push("", t("listings.offerContactTitle"));
      if (agentContact.name) lines.push(agentContact.name);
      if (agentContact.phone) lines.push(agentContact.phone);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (appUrl && listing.status === LISTING_STATUSES.PUBLISHED) {
      lines.push("", `${appUrl}/properties/${companyId}_${listingId}`);
    }

    return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [listing, agentContact, mapsHref, companyId, listingId]);

  // Advertising checklist toggle (note 9). Rules-enforced by the listing's
  // edit permission; UI is only shown to editors.
  async function togglePlatform(key: string, next: boolean) {
    try {
      await updateDoc(
        doc(getFirebaseDb(), `companies/${companyId}/listings/${listingId}`),
        {
          [`publishedOn.${key}`]: next,
          updatedAt: serverTimestamp(),
        },
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : t("listings.statusUpdateFailed"),
      );
    }
  }

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
              <DiscountedPrice
                price={listing.price}
                discount={listing.discount}
                badge
                suffix={
                  listing.rentPeriod ? (
                    <span className="ms-1 text-sm font-normal text-muted-foreground">
                      / {rentPeriodLabel(listing.rentPeriod)}
                    </span>
                  ) : undefined
                }
              />
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
                  {/* Only images can be a cover (rendered in <img> on cards). */}
                  {!selected.isCover &&
                    selected.path &&
                    selected.type !== "video" && (
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

      {/* Auction / bidding — for-sale listings only. Live summary comes from
          the listing snapshot above; the panel adds a bids listener + controls. */}
      {listing.type === LISTING_TYPES.SALE && (
        <Section title="المزايدة">
          <AuctionPanel
            companyId={companyId}
            listingId={listingId}
            auction={listing.auction}
            askingPrice={listing.price}
            canManage={canManageBids}
            authReady={authReady}
          />
        </Section>
      )}

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
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-muted"
          >
            <MapPin className="h-4 w-4" />
            {t("listings.openInGoogleMaps")}
          </a>
        )}
      </Section>

      {/* Listing source (note 8) */}
      <Section title={t("listings.sectionSource")}>
        <p className="text-sm text-foreground">
          {listing.source === "broker"
            ? t("listings.sourceBroker")
            : t("listings.sourceOwner")}
        </p>
        {listing.source === "broker" && listing.brokerInfo && (
          <div className="mt-3">
            <InfoGrid
              rows={[
                {
                  label: t("listings.brokerAgency"),
                  value: str(listing.brokerInfo.agencyName),
                },
                {
                  label: t("listings.brokerName"),
                  value: str(listing.brokerInfo.brokerName),
                },
                {
                  label: t("listings.brokerPhone"),
                  value: str(listing.brokerInfo.phone),
                },
              ]}
            />
          </div>
        )}
      </Section>

      {/* Advertising publish status (note 9) */}
      <Section title={t("listings.sectionPublishStatus")}>
        <div className="flex flex-wrap gap-2">
          {PUBLISH_PLATFORMS.map(({ key, label }) => {
            const active = listing.publishedOn[key] === true;
            const chip = (
              <>
                {active ? "✓ " : "✗ "}
                {label}
              </>
            );
            const cls = cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground",
            );
            return canEdit ? (
              <button
                key={key}
                type="button"
                onClick={() => togglePlatform(key, !active)}
                className={cn(cls, "hover:border-primary/50")}
              >
                {chip}
              </button>
            ) : (
              <span key={key} className={cls}>
                {chip}
              </span>
            );
          })}
        </div>
        {canEdit && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("listings.publishStatusHint")}
          </p>
        )}
      </Section>

      {/* Independently rentable units (note 6) */}
      <ListingUnitsManager
        companyId={companyId}
        listingId={listingId}
        canEdit={canEdit}
        defaultType={listing.type === LISTING_TYPES.RENT ? "rent" : "sale"}
        publicUnitsCount={listing.publicUnitsCount}
      />

      {/* WhatsApp offer (note 7) */}
      {whatsappHref && (
        <Section title={t("listings.sectionShare")}>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            {t("listings.sendWhatsappOffer")}
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("listings.whatsappOfferHint")}
          </p>
        </Section>
      )}

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

      {/* Confidential owner info (visible only when the private subdoc is
          readable: super admin, listing creator, or view_owner_info) */}
      {privateOwner.length > 0 && (
        <Section title={t("listings.sectionOwner")}>
          <InfoGrid rows={privateOwner} />
        </Section>
      )}

      {/* Deed / registry details */}
      {deedEntries.length > 0 && (
        <Section title={t("listings.sectionDeed")}>
          <InfoGrid rows={deedEntries} />
        </Section>
      )}

      {/* Contacts — when phone visibility is restricted, the full contacts
          (with phones) live in the private subdoc; viewers who can read it
          see those, everyone else sees the phone-less projection. */}
      {(privateContacts.length > 0 ? privateContacts : listing.contacts)
        .length > 0 && (
        <Section title={t("listings.sectionContacts")}>
          <div className="space-y-3">
            {(privateContacts.length > 0
              ? privateContacts
              : listing.contacts
            ).map((c, i) => (
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
            // The offer's creator/publisher is confidential — hide it from
            // employees who can't see protected info.
            ...(canViewConfidential
              ? [
                  {
                    label: t("listings.metaPublishedBy"),
                    value:
                      publisherName ?? t("listings.metaUnknownPublisher"),
                  },
                ]
              : []),
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
