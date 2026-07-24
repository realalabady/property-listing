"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus, Trash2 } from "lucide-react";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { Accordion, AccordionSection } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import type { ListingPublishedOn, ListingSource } from "@/types/listing";
import { SAUDI_COUNTRY } from "@/constants/saudi-regions";
import {
  loadCities,
  loadDistricts,
  loadRegions,
  type GeoCity,
  type GeoDistrict,
  type GeoRegion,
} from "@/lib/geo/saudi-geo";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";

// Client-only Leaflet map for picking the exact pin — never SSR'd.
const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-xl bg-muted" />
  ),
});

const DEFAULT_REGION_ID = "1"; // Riyadh region
const DEFAULT_CITY_ID = "3"; // Riyadh city

const RENT_PERIODS: Array<{ value: string; label: string }> = [
  { value: "monthly", label: "شهري" },
  { value: "yearly", label: "سنوي" },
  { value: "daily", label: "يومي" },
];
const PAYMENT_CYCLES: Array<{ value: string; label: string }> = [
  { value: "monthly", label: "شهري" },
  { value: "quarterly", label: "ربع سنوي" },
  { value: "semiannual", label: "نصف سنوي" },
  { value: "annual", label: "سنوي" },
];

interface NewListingFormProps {
  companyId: string;
  userId: string;
  /** "create" (default) adds a new listing; "edit" loads + updates listingId. */
  mode?: "create" | "edit";
  listingId?: string;
}

interface ContactRow {
  name: string;
  role: string;
  phone: string;
  note: string;
}

interface FormState {
  // Required
  title: string;
  price: string;
  area: string;
  type: ListingType;
  status: ListingStatus;
  // Pricing (conditional)
  rentPeriod: string;
  paymentCycle: string;
  deposit: string;
  discount: string;
  priceNegotiable: boolean;
  // Optional auction (sale only). Enables bidding on the detail page; the
  // starting bid seeds the auction. Bids are placed later, not here.
  auctionEnabled: boolean;
  auctionStartPrice: string;
  auctionMinIncrement: string;
  // Unit specifications & amenities
  bedrooms: string;
  bathrooms: string;
  parking: string;
  yearBuilt: string;
  furnished: boolean;
  balcony: boolean;
  garden: boolean;
  pool: boolean;
  gym: boolean;
  security: boolean;
  elevator: boolean;
  ac: boolean;
  heating: boolean;
  petFriendly: boolean;
  // Location (cascading, official Saudi National Address ids)
  regionId: string;
  cityId: string;
  districtId: string;
  // Exact map pin: coords picked on the map. `mapUrl` is retained only to read
  // a legacy pasted-link value on edit; it's no longer entered in the form.
  mapUrl: string;
  mapLat: number | null;
  mapLng: number | null;
  // Optional
  description: string;
  category: ListingCategory;
  usageType: string;
  propertyNumber: string;
  titleEn: string;
  deedType: string;
  deedNumber: string;
  deedIssueDate: string;
  propertyArea: string;
  additionalNumber1: string;
  additionalNumber2: string;
  parcelNumber: string;
  blockNumber: string;
  buildDate: string;
  floorsCount: string;
  unitsPerFloor: string;
  electricityMeterNumber: string;
  electricitySubscriptionNumber: string;
  waterMeterNumber: string;
  waterSubscriptionNumber: string;
  streetName: string;
  postalCode: string;
  buildingNumber: string;
  deedReference: string;
  brokerageContract: string;
  // Confidential owner identity (stored in the protected private subdoc)
  ownerName: string;
  ownerPhone: string;
  ownerNationalId: string;
  ownerNote: string;
  planNumber: string;
  // Listing source (note 8)
  source: ListingSource;
  brokerAgencyName: string;
  brokerName: string;
  brokerPhone: string;
  // Advertising publish checklist (note 9)
  pubAqar: boolean;
  pubInstagram: boolean;
  pubX: boolean;
  pubFacebook: boolean;
  pubSnapchat: boolean;
}

const initialState: FormState = {
  title: "",
  price: "",
  area: "",
  type: LISTING_TYPES.SALE,
  status: LISTING_STATUSES.DRAFT,
  rentPeriod: "monthly",
  paymentCycle: "monthly",
  deposit: "",
  discount: "",
  priceNegotiable: false,
  auctionEnabled: false,
  auctionStartPrice: "",
  auctionMinIncrement: "",
  bedrooms: "",
  bathrooms: "",
  parking: "",
  yearBuilt: "",
  furnished: false,
  balcony: false,
  garden: false,
  pool: false,
  gym: false,
  security: false,
  elevator: false,
  ac: false,
  heating: false,
  petFriendly: false,
  regionId: DEFAULT_REGION_ID,
  cityId: DEFAULT_CITY_ID,
  districtId: "",
  mapUrl: "",
  mapLat: null,
  mapLng: null,
  description: "",
  category: LISTING_CATEGORIES.APARTMENT,
  usageType: "",
  propertyNumber: "",
  titleEn: "",
  deedType: "",
  deedNumber: "",
  deedIssueDate: "",
  propertyArea: "",
  additionalNumber1: "",
  additionalNumber2: "",
  parcelNumber: "",
  blockNumber: "",
  buildDate: "",
  floorsCount: "",
  unitsPerFloor: "",
  electricityMeterNumber: "",
  electricitySubscriptionNumber: "",
  waterMeterNumber: "",
  waterSubscriptionNumber: "",
  streetName: "",
  postalCode: "",
  buildingNumber: "",
  deedReference: "",
  brokerageContract: "",
  ownerName: "",
  ownerPhone: "",
  ownerNationalId: "",
  ownerNote: "",
  planNumber: "",
  source: "owner",
  brokerAgencyName: "",
  brokerName: "",
  brokerPhone: "",
  pubAqar: false,
  pubInstagram: false,
  pubX: false,
  pubFacebook: false,
  pubSnapchat: false,
};

const PUBLISH_PLATFORMS: Array<{ key: keyof ListingPublishedOn; label: string }> =
  [
    { key: "aqar", label: "منصة عقار" },
    { key: "instagram", label: "انستقرام" },
    { key: "x", label: "إكس (تويتر)" },
    { key: "facebook", label: "فيسبوك" },
    { key: "snapchat", label: "سناب شات" },
  ];

/** Form keys whose values live in the protected private subdoc (deed block)
 * for new-style listings. Legacy listings keep them in `details`. */
const PRIVATE_DEED_FORM_KEYS = [
  "deedType",
  "deedNumber",
  "deedIssueDate",
  "deedReference",
  "propertyNumber",
] as const;

const USAGE_TYPES = ["سكني", "تجاري", "زراعي", "صناعي", "مكتبي"];

type AmenityKey =
  | "furnished"
  | "balcony"
  | "garden"
  | "pool"
  | "gym"
  | "security"
  | "elevator"
  | "ac"
  | "heating"
  | "petFriendly";

const AMENITY_TOGGLES: Array<{ key: AmenityKey; label: string }> = [
  { key: "furnished", label: "مفروش" },
  { key: "ac", label: "تكييف" },
  { key: "elevator", label: "مصعد" },
  { key: "balcony", label: "شرفة" },
  { key: "garden", label: "حديقة" },
  { key: "pool", label: "مسبح" },
  { key: "gym", label: "صالة رياضية" },
  { key: "security", label: "أمن وحراسة" },
  { key: "heating", label: "تدفئة" },
  { key: "petFriendly", label: "يسمح بالحيوانات الأليفة" },
];

// Constrained numeric option lists — dropdowns instead of free text so the
// stored values are clean integers (no typos, searchable, matchable).
const BEDROOM_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BATHROOM_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const PARKING_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1970 + 1 },
  (_, i) => CURRENT_YEAR - i,
);

/** Label for a capped numeric option: the max entry renders as "N+". */
function countLabel(value: number, options: number[]): string {
  return value === options[options.length - 1] ? `${value}+` : String(value);
}

/**
 * Map a stored listing document back into editable form state (for edit mode).
 * Location is returned as Arabic names; the cascading select IDs are resolved
 * separately once the geo dataset has loaded.
 */
function listingDocToForm(data: Record<string, unknown>): {
  form: FormState;
  contacts: ContactRow[];
  locationNames: { region: string; city: string; district: string };
} {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const numStr = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? String(v) : "";
  const obj = (v: unknown): Record<string, unknown> =>
    typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

  const details = obj(data.details);
  const amenities = obj(data.amenities);
  const location = obj(data.location);
  const broker = obj(data.brokerInfo);
  const publishedOn = obj(data.publishedOn);
  // Only resurface coords in the form when they were an exact pin — a legacy
  // city-center lat/lng must NOT masquerade as a precise location on re-save.
  const locationPrecise = location.preciseLocation === true;

  const form: FormState = {
    ...initialState,
    title: str(data.title),
    price: numStr(data.price),
    area: numStr(data.area),
    type: (data.type as ListingType) ?? LISTING_TYPES.SALE,
    status: (data.status as ListingStatus) ?? LISTING_STATUSES.DRAFT,
    category: (data.category as ListingCategory) ?? LISTING_CATEGORIES.APARTMENT,
    rentPeriod: str(data.rentPeriod) || "monthly",
    paymentCycle: str(details.paymentCycle) || "monthly",
    deposit: numStr(details.deposit),
    discount: numStr(data.discount),
    priceNegotiable: Boolean(data.priceNegotiable),
    auctionEnabled: obj(data.auction).enabled === true,
    auctionStartPrice: numStr(obj(data.auction).startPrice),
    auctionMinIncrement: numStr(obj(data.auction).minIncrement),
    bedrooms: numStr(data.bedrooms),
    bathrooms: numStr(data.bathrooms),
    parking: numStr(amenities.parking),
    yearBuilt: numStr(data.yearBuilt),
    furnished: Boolean(amenities.furnished),
    balcony: Boolean(amenities.balcony),
    garden: Boolean(amenities.garden),
    pool: Boolean(amenities.pool),
    gym: Boolean(amenities.gym),
    security: Boolean(amenities.security),
    elevator: Boolean(amenities.elevator),
    ac: Boolean(amenities.ac),
    heating: Boolean(amenities.heating),
    petFriendly: Boolean(amenities.petFriendly),
    mapUrl: str(location.mapUrl),
    mapLat:
      locationPrecise && typeof location.lat === "number"
        ? location.lat
        : null,
    mapLng:
      locationPrecise && typeof location.lng === "number"
        ? location.lng
        : null,
    description: str(data.description),
    usageType: str(details.usageType),
    propertyNumber: str(details.propertyNumber),
    titleEn: str(details.titleEn),
    deedType: str(details.deedType),
    deedNumber: str(details.deedNumber),
    deedIssueDate: str(details.deedIssueDate),
    propertyArea: numStr(details.propertyArea),
    additionalNumber1: str(details.additionalNumber1),
    additionalNumber2: str(details.additionalNumber2),
    parcelNumber: str(details.parcelNumber),
    blockNumber: str(details.blockNumber),
    buildDate: str(details.buildDate),
    floorsCount: numStr(details.floorsCount),
    unitsPerFloor: numStr(details.unitsPerFloor),
    electricityMeterNumber: str(details.electricityMeterNumber),
    electricitySubscriptionNumber: str(details.electricitySubscriptionNumber),
    waterMeterNumber: str(details.waterMeterNumber),
    waterSubscriptionNumber: str(details.waterSubscriptionNumber),
    streetName: str(details.streetName),
    postalCode: str(details.postalCode),
    buildingNumber: str(details.buildingNumber),
    deedReference: str(details.deedReference),
    brokerageContract: str(details.brokerageContract),
    planNumber: str(details.planNumber),
    source: data.source === "broker" ? "broker" : "owner",
    brokerAgencyName: str(broker.agencyName),
    brokerName: str(broker.brokerName),
    brokerPhone: str(broker.phone),
    pubAqar: Boolean(publishedOn.aqar),
    pubInstagram: Boolean(publishedOn.instagram),
    pubX: Boolean(publishedOn.x),
    pubFacebook: Boolean(publishedOn.facebook),
    pubSnapchat: Boolean(publishedOn.snapchat),
  };

  const rawContacts = Array.isArray(data.contacts) ? data.contacts : [];
  const contacts: ContactRow[] = rawContacts
    .filter(
      (c): c is Record<string, unknown> =>
        typeof c === "object" && c !== null,
    )
    .map((c) => ({
      name: str(c.name),
      role: str(c.role),
      phone: str(c.phone),
      note: str(c.note),
    }));

  return {
    form,
    contacts:
      contacts.length > 0
        ? contacts
        : [{ name: "", role: "", phone: "", note: "" }],
    locationNames: {
      region: str(location.region),
      city: str(location.city),
      district: str(location.district),
    },
  };
}

interface Errors {
  title?: string;
  price?: string;
  discount?: string;
  area?: string;
  district?: string;
}

// Allow Arabic/Latin letters, digits and spaces only (per "حروف و أرقام فقط").
const sanitizeAlnum = (value: string) =>
  value.replace(/[^\p{L}\p{N}\s]/gu, "");
const sanitizePhone = (value: string) => value.replace(/[^\d+\-\s]/g, "");

export function NewListingForm({
  companyId,
  userId,
  mode = "create",
  listingId,
}: NewListingFormProps) {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const authReady = !authLoading && Boolean(authUser);
  const isEdit = mode === "edit";

  const [form, setForm] = useState<FormState>(initialState);
  const [contacts, setContacts] = useState<ContactRow[]>([
    { name: "", role: "", phone: "", note: "" },
  ]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create mode: best-effort plan-quota pre-check so the user sees a message
  // (and a disabled submit) before hitting the enforced 409 on POST.
  const [planAtLimit, setPlanAtLimit] = useState(false);
  const [planMaxListings, setPlanMaxListings] = useState<number | null>(null);

  // Edit mode: load the existing listing once, then resolve its (Arabic)
  // location names back into the cascading-select IDs after geo data loads.
  const [hydrated, setHydrated] = useState(!isEdit);
  const [pendingLoc, setPendingLoc] = useState<{
    region: string;
    city: string;
    district: string;
  } | null>(null);
  const [originalStatus, setOriginalStatus] = useState<ListingStatus | null>(
    null,
  );
  // Whether the listing already had an ENABLED auction when the edit form
  // loaded. Used so a listing edit never clobbers a live auction's bid data —
  // the auction is only (re)written from the form when this toggle changes.
  const [originalAuctionEnabled, setOriginalAuctionEnabled] = useState(false);
  // Protected owner/deed subdoc state for edit mode:
  //  - "none":     legacy listing (no subdoc) → deed stays in `details`
  //  - "readable": subdoc loaded → deed/owner edit against the subdoc
  //  - "denied":   viewer may edit the listing but not see owner/deed →
  //                those inputs are hidden and the subdoc left untouched
  const [privateState, setPrivateState] = useState<
    "none" | "readable" | "denied"
  >("none");
  const [privateHasRestricted, setPrivateHasRestricted] = useState(false);

  // Official Saudi geography dataset (fetched + cached from /public/geo).
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [geoLoading, setGeoLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadRegions(), loadCities(), loadDistricts()])
      .then(([r, c, dd]) => {
        if (!mounted) return;
        setRegions(r);
        setCities(c);
        setDistricts(dd);
        setGeoLoading(false);
      })
      .catch(() => {
        if (mounted) setGeoLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Create mode: read the current listing usage against the plan cap.
  useEffect(() => {
    if (isEdit || !authReady) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}/listings`, {
          cache: "no-store",
        });
        if (!res.ok || !mounted) return;
        const data = (await res.json()) as {
          atLimit?: boolean;
          maxListings?: number;
        };
        if (!mounted) return;
        setPlanAtLimit(Boolean(data.atLimit));
        setPlanMaxListings(
          typeof data.maxListings === "number" ? data.maxListings : null,
        );
      } catch {
        // Pre-check is best-effort; the POST still enforces the quota.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isEdit, authReady, companyId]);

  // Edit mode: fetch the listing once auth is ready and pre-fill the form.
  useEffect(() => {
    if (!isEdit || !listingId || !authReady) return;
    let mounted = true;
    (async () => {
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(
          doc(db, `companies/${companyId}/listings/${listingId}`),
        );
        if (!mounted) return;
        if (!snap.exists()) {
          setError(t("listings.detailNotFound"));
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        const mapped = listingDocToForm(data);

        // New-style listings keep owner/deed (and possibly full contacts) in
        // the protected private subdoc; hydrate it when we're allowed to.
        if (data.hasPrivateData === true) {
          try {
            const privateSnap = await getDoc(
              doc(
                db,
                `companies/${companyId}/listings/${listingId}/private/data`,
              ),
            );
            if (privateSnap.exists()) {
              const priv = privateSnap.data() as Record<string, unknown>;
              const owner =
                typeof priv.owner === "object" && priv.owner !== null
                  ? (priv.owner as Record<string, unknown>)
                  : {};
              const deed =
                typeof priv.deed === "object" && priv.deed !== null
                  ? (priv.deed as Record<string, unknown>)
                  : {};
              const asStr = (v: unknown) => (typeof v === "string" ? v : "");
              mapped.form.ownerName = asStr(owner.name);
              mapped.form.ownerPhone = asStr(owner.phone);
              mapped.form.ownerNationalId = asStr(owner.nationalId);
              mapped.form.ownerNote = asStr(owner.note);
              mapped.form.deedType = asStr(deed.deedType);
              mapped.form.deedNumber = asStr(deed.deedNumber);
              mapped.form.deedIssueDate = asStr(deed.deedIssueDate);
              mapped.form.deedReference = asStr(deed.deedReference);
              mapped.form.propertyNumber = asStr(deed.propertyNumber);
              const restricted = Array.isArray(priv.restrictedContacts)
                ? (priv.restrictedContacts as Record<string, unknown>[])
                : [];
              if (restricted.length > 0) {
                mapped.contacts = restricted.map((c) => ({
                  name: asStr(c.name),
                  role: asStr(c.role),
                  phone: asStr(c.phone),
                  note: asStr(c.note),
                }));
                setPrivateHasRestricted(true);
              }
            }
            setPrivateState("readable");
          } catch {
            // Permission denied: hide owner/deed inputs, leave subdoc alone.
            setPrivateState("denied");
          }
        }

        if (!mounted) return;
        setForm(mapped.form);
        setContacts(mapped.contacts);
        setPendingLoc(mapped.locationNames);
        setOriginalStatus(mapped.form.status);
        setOriginalAuctionEnabled(mapped.form.auctionEnabled);
        setHydrated(true);
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("listings.createFailed"),
          );
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isEdit, listingId, companyId, authReady]);

  // Resolve the loaded location names into region/city/district select IDs
  // once the geo dataset is available.
  useEffect(() => {
    if (!pendingLoc || geoLoading) return;
    const region = regions.find((r) => r.name_ar === pendingLoc.region);
    const regionId = region ? String(region.region_id) : DEFAULT_REGION_ID;
    const city = cities.find(
      (c) =>
        c.name_ar === pendingLoc.city && String(c.region_id) === regionId,
    );
    const cityId = city ? String(city.city_id) : "";
    const district = districts.find(
      (d) =>
        d.name_ar === pendingLoc.district && String(d.city_id) === cityId,
    );
    const districtId = district ? String(district.district_id) : "";
    setForm((prev) => ({ ...prev, regionId, cityId, districtId }));
    setPendingLoc(null);
  }, [pendingLoc, geoLoading, regions, cities, districts]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  const cityOptions = useMemo(
    () => cities.filter((c) => String(c.region_id) === form.regionId),
    [cities, form.regionId],
  );
  const districtOptions = useMemo(
    () => districts.filter((dd) => String(dd.city_id) === form.cityId),
    [districts, form.cityId],
  );
  // Selected city's center — used to frame the pin picker before a pin is set.
  const cityCenter = useMemo(() => {
    const city = cities.find((c) => String(c.city_id) === form.cityId);
    return city?.center
      ? { lat: city.center[0], lng: city.center[1] }
      : null;
  }, [cities, form.cityId]);

  function onRegionChange(regionId: string) {
    const firstCity = cities.find((c) => String(c.region_id) === regionId);
    setForm((prev) => ({
      ...prev,
      regionId,
      cityId: firstCity ? String(firstCity.city_id) : "",
      districtId: "",
    }));
  }
  function onCityChange(cityId: string) {
    setForm((prev) => ({ ...prev, cityId, districtId: "" }));
  }

  // Map pin: clicking/dragging on the Saudi map sets the exact coordinates.
  // Dropping a pin also drops any legacy pasted Maps link so it can't linger.
  function onPickLocation(lat: number, lng: number) {
    setForm((prev) => ({ ...prev, mapLat: lat, mapLng: lng, mapUrl: "" }));
  }

  function clearPin() {
    setForm((prev) => ({ ...prev, mapLat: null, mapLng: null, mapUrl: "" }));
  }

  function updateContact(index: number, key: keyof ContactRow, value: string) {
    setContacts((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!form.title.trim()) next.title = t("common.fieldRequired");
    const price = Number(form.price);
    if (!form.price.trim() || Number.isNaN(price) || price <= 0) {
      next.price = t("common.fieldRequired");
    }
    // Discount is optional, but when present it must be a positive amount that
    // stays below the price (a discount can't exceed the property's value).
    if (form.discount.trim()) {
      const discount = Number(form.discount);
      if (Number.isNaN(discount) || discount < 0) {
        next.discount = t("common.fieldRequired");
      } else if (!Number.isNaN(price) && discount >= price) {
        next.discount = "الخصم يجب أن يكون أقل من السعر";
      }
    }
    const area = Number(form.area);
    if (!form.area.trim() || Number.isNaN(area) || area <= 0) {
      next.area = t("common.fieldRequired");
    }
    // District is required whenever the selected city actually has districts.
    if (districtOptions.length > 0 && !form.districtId) {
      next.district = t("common.fieldRequired");
    }
    return next;
  }

  const requiredStatus = useMemo(() => {
    if (submitted && (errors.title || errors.price || errors.area)) {
      return "error" as const;
    }
    if (form.title.trim() && Number(form.price) > 0 && Number(form.area) > 0) {
      return "complete" as const;
    }
    return "neutral" as const;
  }, [submitted, errors, form.title, form.price, form.area]);

  function buildDetails(): Record<string, string | number> {
    const details: Record<string, string | number> = {};
    const text = (key: string, value: string) => {
      if (value.trim()) details[key] = value.trim();
    };
    const num = (key: string, value: string) => {
      const n = Number(value);
      if (value.trim() && Number.isFinite(n)) details[key] = n;
    };
    text("usageType", form.usageType);
    text("propertyNumber", form.propertyNumber);
    text("titleEn", form.titleEn);
    text("deedType", form.deedType);
    text("deedNumber", form.deedNumber);
    text("deedIssueDate", form.deedIssueDate);
    num("propertyArea", form.propertyArea);
    text("additionalNumber1", form.additionalNumber1);
    text("additionalNumber2", form.additionalNumber2);
    text("parcelNumber", form.parcelNumber);
    text("blockNumber", form.blockNumber);
    text("buildDate", form.buildDate);
    num("floorsCount", form.floorsCount);
    num("unitsPerFloor", form.unitsPerFloor);
    text("electricityMeterNumber", form.electricityMeterNumber);
    text("electricitySubscriptionNumber", form.electricitySubscriptionNumber);
    text("waterMeterNumber", form.waterMeterNumber);
    text("waterSubscriptionNumber", form.waterSubscriptionNumber);
    text("streetName", form.streetName);
    text("postalCode", form.postalCode);
    text("buildingNumber", form.buildingNumber);
    text("deedReference", form.deedReference);
    text("planNumber", form.planNumber);
    text("brokerageContract", form.brokerageContract);
    return details;
  }

  // Origin classification (note 8): broker fields only when source is broker.
  function buildSourceFields(): Record<string, unknown> {
    // On edit, null clears a previously-stored brokerInfo when switching to owner.
    if (form.source !== "broker") return { source: "owner", brokerInfo: null };
    const brokerInfo: Record<string, string> = {};
    if (form.brokerAgencyName.trim())
      brokerInfo.agencyName = form.brokerAgencyName.trim();
    if (form.brokerName.trim()) brokerInfo.brokerName = form.brokerName.trim();
    if (form.brokerPhone.trim()) brokerInfo.phone = form.brokerPhone.trim();
    return { source: "broker", brokerInfo };
  }

  // Advertising checklist (note 9): store all five booleans so toggles persist.
  function buildPublishedOn(): Record<string, boolean> {
    return {
      aqar: form.pubAqar,
      instagram: form.pubInstagram,
      x: form.pubX,
      facebook: form.pubFacebook,
      snapchat: form.pubSnapchat,
    };
  }

  // Amenities: store only the toggles that are ON, plus a parking count when > 0.
  function buildAmenities(): Record<string, boolean | number> {
    const amenities: Record<string, boolean | number> = {};
    for (const { key } of AMENITY_TOGGLES) {
      if (form[key]) amenities[key] = true;
    }
    const parking = Number(form.parking);
    if (form.parking.trim() && Number.isFinite(parking) && parking > 0) {
      amenities.parking = parking;
    }
    return amenities;
  }

  // Top-level numeric specs. On create we omit empties (the Firestore client
  // SDK rejects `undefined`). On edit we write `null` for cleared fields so an
  // unset value actually removes the previously-stored number.
  function buildSpecs(clearEmpty: boolean): Record<string, number | null> {
    const specs: Record<string, number | null> = {};
    const num = (key: string, value: string) => {
      const n = Number(value);
      if (value.trim() && Number.isFinite(n) && n >= 0) specs[key] = n;
      else if (clearEmpty) specs[key] = null;
    };
    num("bedrooms", form.bedrooms);
    num("bathrooms", form.bathrooms);
    num("yearBuilt", form.yearBuilt);
    return specs;
  }

  async function handleSubmit() {
    setSubmitted(true);
    const found = validate();
    setErrors(found);
    if (found.title || found.price || found.area || found.district) {
      setError(t("common.fixErrors"));
      return;
    }
    if (!authReady) {
      setError(t("listings.createFailed"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const db = getFirebaseDb();

      const region = regions.find((r) => String(r.region_id) === form.regionId);
      const city = cities.find((c) => String(c.city_id) === form.cityId);
      const district = form.districtId
        ? districts.find((dd) => String(dd.district_id) === form.districtId)
        : undefined;
      const pinLat = form.mapLat;
      const pinLng = form.mapLng;

      // Prefer the exact pin dropped on the map. Only fall back to the city
      // center when no precise pin was provided (kept for backwards
      // compatibility — those pins are flagged imprecise so the map jitters
      // them instead of stacking every unit on one point).
      const hasPreciseCoords = pinLat != null && pinLng != null;
      const lat = hasPreciseCoords ? pinLat : (city?.center?.[0] ?? null);
      const lng = hasPreciseCoords ? pinLng : (city?.center?.[1] ?? null);
      const isRent = form.type === LISTING_TYPES.RENT;

      const cleanContacts = contacts
        .filter((c) => c.name.trim() || c.phone.trim())
        .map((c) => ({
          name: c.name.trim(),
          role: c.role.trim(),
          phone: c.phone.trim(),
          note: c.note.trim(),
        }));

      const details = buildDetails();
      if (isRent) {
        if (form.paymentCycle) details.paymentCycle = form.paymentCycle;
        const dep = Number(form.deposit);
        if (form.deposit.trim() && Number.isFinite(dep)) details.deposit = dep;
      }

      // Fields shared by create + edit. On edit these maps (location, details,
      // amenities, contacts) REPLACE the stored values, so de-selected items
      // are correctly dropped.
      const corePayload = {
        companyId,
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        category: form.category,
        price: Number(form.price),
        discount: form.discount.trim() ? Number(form.discount) : 0,
        currency: "SAR",
        rentPeriod: isRent ? form.rentPeriod : null,
        priceNegotiable: isRent ? false : form.priceNegotiable,
        location: {
          country: SAUDI_COUNTRY.ar,
          region: region?.name_ar ?? "",
          city: city?.name_ar ?? "",
          district: district?.name_ar ?? "",
          lat,
          lng,
          preciseLocation: hasPreciseCoords,
          ...(hasPreciseCoords && form.mapUrl.trim()
            ? { mapUrl: form.mapUrl.trim() }
            : {}),
        },
        area: Number(form.area),
        areaUnit: "sqm",
        ...buildSpecs(isEdit),
        amenities: buildAmenities(),
        contacts: cleanContacts,
        details,
        ...buildSourceFields(),
        publishedOn: buildPublishedOn(),
        status: form.status,
      };

      // Optional auction (sale only). CREATE sends a light payload the API
      // route seeds into a full auction object. EDIT must never clobber a live
      // auction's bid data, so it only writes when the toggle actually changes:
      // newly enabled → seed fresh; turned off → disable + close (bid history
      // in the subcollection is untouched). Ongoing tweaks happen on the detail
      // page, not here.
      const isSale = form.type === LISTING_TYPES.SALE;
      const auctionStart = form.auctionStartPrice.trim()
        ? Number(form.auctionStartPrice)
        : Number(form.price) || 0;
      const auctionMinInc = form.auctionMinIncrement.trim()
        ? Math.max(0, Number(form.auctionMinIncrement))
        : 0;
      const auctionCreatePayload =
        isSale && form.auctionEnabled
          ? {
              auction: {
                enabled: true,
                ...(form.auctionStartPrice.trim()
                  ? { startPrice: auctionStart }
                  : {}),
                minIncrement: auctionMinInc,
              },
            }
          : {};

      // Confidential owner block (goes to the protected private subdoc).
      const ownerBlock: Record<string, string> = {};
      if (form.ownerName.trim()) ownerBlock.name = form.ownerName.trim();
      if (form.ownerPhone.trim()) ownerBlock.phone = form.ownerPhone.trim();
      if (form.ownerNationalId.trim())
        ownerBlock.nationalId = form.ownerNationalId.trim();
      if (form.ownerNote.trim()) ownerBlock.note = form.ownerNote.trim();

      if (isEdit && listingId) {
        const updatePayload: Record<string, unknown> = {
          ...corePayload,
          updatedAt: serverTimestamp(),
        };
        // Auction: only write when the toggle changed, so a routine edit never
        // resets a live auction's currentBid/bidCount.
        if (isSale && form.auctionEnabled && !originalAuctionEnabled) {
          updatePayload.auction = {
            enabled: true,
            status: "open",
            startPrice: auctionStart,
            minIncrement: auctionMinInc,
            currentBid: null,
            bidCount: 0,
            highBidId: null,
            highBidByEmployeeId: null,
            highBidByEmployeeName: null,
            startedByEmployeeId: userId,
            startedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            closedAt: null,
          };
        } else if (originalAuctionEnabled && (!form.auctionEnabled || !isSale)) {
          updatePayload["auction.enabled"] = false;
          updatePayload["auction.status"] = "closed";
          updatePayload["auction.updatedAt"] = serverTimestamp();
          updatePayload["auction.closedAt"] = serverTimestamp();
        }
        // Stamp publishedAt only on the first transition into "published".
        if (
          form.status === LISTING_STATUSES.PUBLISHED &&
          originalStatus !== LISTING_STATUSES.PUBLISHED
        ) {
          updatePayload.publishedAt = serverTimestamp();
        }

        // New-style listing whose private subdoc we can read: deed/owner (and
        // restricted contacts) are saved to the subdoc, never the main doc.
        if (privateState === "readable") {
          const deedBlock: Record<string, string> = {};
          for (const key of PRIVATE_DEED_FORM_KEYS) {
            delete (updatePayload.details as Record<string, unknown>)[key];
            const value = form[key].trim();
            if (value) deedBlock[key] = value;
          }

          let mainContacts = cleanContacts;
          let restrictedContacts: typeof cleanContacts = [];
          if (privateHasRestricted && cleanContacts.some((c) => c.phone)) {
            restrictedContacts = cleanContacts;
            mainContacts = cleanContacts.map((c) => ({
              name: c.name,
              role: c.role,
              phone: "",
              note: c.note,
            }));
          }
          updatePayload.contacts = mainContacts;

          await updateDoc(
            doc(db, `companies/${companyId}/listings/${listingId}`),
            updatePayload,
          );
          // Full replace: we hydrated the whole subdoc, so we own its state.
          await setDoc(
            doc(
              db,
              `companies/${companyId}/listings/${listingId}/private/data`,
            ),
            {
              ...(Object.keys(ownerBlock).length > 0
                ? { owner: ownerBlock }
                : {}),
              ...(Object.keys(deedBlock).length > 0 ? { deed: deedBlock } : {}),
              ...(restrictedContacts.length > 0
                ? { restrictedContacts }
                : {}),
              updatedAt: serverTimestamp(),
              updatedBy: userId,
            },
          );
        } else {
          // Legacy listing ("none") or private data not visible ("denied"):
          // keep today's behavior and never touch the subdoc. When denied,
          // also make sure no deed data can land on the member-readable doc.
          if (privateState === "denied") {
            for (const key of PRIVATE_DEED_FORM_KEYS) {
              delete (updatePayload.details as Record<string, unknown>)[key];
            }
          }
          await updateDoc(
            doc(db, `companies/${companyId}/listings/${listingId}`),
            updatePayload,
          );
        }

        router.push(ROUTES.DASHBOARD_LISTING_DETAIL(listingId));
        router.refresh();
        return;
      }

      // Creation goes through the API so the per-plan listing quota is
      // enforced server-side (firestore rules deny direct client creates).
      // Deed fields inside `details` are lifted into the protected subdoc by
      // the server; the owner block is sent explicitly.
      const res = await fetch(`/api/companies/${companyId}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...corePayload,
          ...auctionCreatePayload,
          ...(Object.keys(ownerBlock).length > 0
            ? { privateData: { owner: ownerBlock } }
            : {}),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || t("listings.createFailed"));
      }

      router.push(ROUTES.DASHBOARD_LISTINGS);
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("listings.createFailed"),
      );
      setSubmitting(false);
    }
  }

  // Owner/deed inputs are hidden when editing a listing whose protected data
  // the viewer isn't allowed to read (edit rights without view rights).
  const showConfidential = !isEdit || privateState !== "denied";

  const textareaClasses = cn(
    "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground",
    "placeholder:text-muted-foreground/70 outline-none transition",
    "focus:border-primary focus:ring-4 focus:ring-primary/15",
  );

  // Edit mode: hold the form until the listing has loaded to avoid a flash of
  // empty fields (and to prevent the user editing a blank form).
  if (isEdit && !hydrated && !error) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        {t("listings.loadingDetail")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isEdit && planAtLimit && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          خطتك وصلت الحد الأقصى للباقة
          {planMaxListings !== null ? ` (${planMaxListings} عقار)` : ""} — قم
          بالترقية لإضافة المزيد.
        </div>
      )}

      <Accordion>
        {/* Required */}
        <AccordionSection
          title={t("listings.listingDetails")}
          description={t("listings.listingDetailsHint")}
          status={requiredStatus}
          defaultOpen
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field
              label={t("listings.title")}
              required
              error={submitted ? errors.title : undefined}
              className="md:col-span-2"
            >
              <Input
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                placeholder={t("listings.titlePlaceholder")}
                aria-invalid={Boolean(submitted && errors.title)}
              />
            </Field>
            <Field label="نوع الإستخدام">
              <Select
                value={form.usageType}
                onChange={(e) => set("usageType")(e.target.value)}
              >
                <option value="">— غير محدد —</option>
                {USAGE_TYPES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("listings.initialStatus")}>
              <Select
                value={form.status}
                onChange={(e) => set("status")(e.target.value as ListingStatus)}
              >
                {Object.values(LISTING_STATUSES).map((value) => (
                  <option key={value} value={value}>
                    {LISTING_STATUS_LABELS[value].ar}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="نوع الإعلان">
              <Select
                value={form.type}
                onChange={(e) => set("type")(e.target.value as ListingType)}
              >
                {Object.values(LISTING_TYPES).map((value) => (
                  <option key={value} value={value}>
                    {LISTING_TYPE_LABELS[value].ar}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="نوع العقار">
              <Select
                value={form.category}
                onChange={(e) =>
                  set("category")(e.target.value as ListingCategory)
                }
              >
                {Object.values(LISTING_CATEGORIES).map((value) => (
                  <option key={value} value={value}>
                    {LISTING_CATEGORY_LABELS[value].ar}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t("listings.price")}
              required
              error={submitted ? errors.price : undefined}
            >
              <Input
                value={form.price}
                onChange={(e) => set("price")(e.target.value)}
                placeholder={t("listings.pricePlaceholder")}
                inputMode="numeric"
                aria-invalid={Boolean(submitted && errors.price)}
              />
            </Field>
            <Field
              label="الخصم (اختياري)"
              hint="مبلغ يُخصم من السعر — يظهر السعر الأصلي مشطوباً"
              error={submitted ? errors.discount : undefined}
            >
              <Input
                value={form.discount}
                onChange={(e) => set("discount")(e.target.value)}
                placeholder="0"
                inputMode="numeric"
                aria-invalid={Boolean(submitted && errors.discount)}
              />
            </Field>
            <Field
              label={t("listings.areaSqm")}
              required
              error={submitted ? errors.area : undefined}
            >
              <Input
                value={form.area}
                onChange={(e) => set("area")(e.target.value)}
                placeholder={t("listings.areaPlaceholder")}
                inputMode="numeric"
                aria-invalid={Boolean(submitted && errors.area)}
              />
            </Field>

            {/* Rent-specific pricing */}
            {form.type === LISTING_TYPES.RENT && (
              <>
                <Field
                  label="السعر لكل (مدة الإيجار)"
                  hint="الفترة التي يشملها السعر المُدخل"
                >
                  <Select
                    value={form.rentPeriod}
                    onChange={(e) => set("rentPeriod")(e.target.value)}
                  >
                    {RENT_PERIODS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="دورة الدفع">
                  <Select
                    value={form.paymentCycle}
                    onChange={(e) => set("paymentCycle")(e.target.value)}
                  >
                    {PAYMENT_CYCLES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="مبلغ التأمين (اختياري)">
                  <Input
                    value={form.deposit}
                    onChange={(e) => set("deposit")(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </Field>
              </>
            )}

            {/* Sale-specific pricing */}
            {form.type !== LISTING_TYPES.RENT && (
              <Field label="قابلية التفاوض" className="md:col-span-2">
                <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.priceNegotiable}
                    onChange={(e) => set("priceNegotiable")(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]"
                  />
                  السعر قابل للتفاوض
                </label>
              </Field>
            )}

            {/* Optional auction (sale only). Turning this on opens bidding on
                the listing's detail page, seeded at the starting bid below. */}
            {form.type === LISTING_TYPES.SALE && (
              <>
                <Field label="المزايدة" className="md:col-span-2">
                  <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 text-sm">
                    <input
                      type="checkbox"
                      checked={form.auctionEnabled}
                      onChange={(e) => set("auctionEnabled")(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]"
                    />
                    تفعيل المزايدة على هذا العقار
                  </label>
                </Field>
                {form.auctionEnabled && (
                  <>
                    <Field label="سعر بداية المزايدة">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder="يُترك فارغًا = سعر العرض"
                        value={form.auctionStartPrice}
                        onChange={(e) =>
                          set("auctionStartPrice")(e.target.value)
                        }
                      />
                    </Field>
                    <Field label="أقل زيادة للمزايدة (اختياري)">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder="0"
                        value={form.auctionMinIncrement}
                        onChange={(e) =>
                          set("auctionMinIncrement")(e.target.value)
                        }
                      />
                    </Field>
                  </>
                )}
              </>
            )}
          </div>
        </AccordionSection>

        {/* Unit specifications & amenities */}
        <AccordionSection
          title="مواصفات ومرافق الوحدة"
          description="عدد الغرف ودورات المياه والمرافق المتوفرة في العقار"
          defaultOpen
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="عدد الغرف">
              <Select
                value={form.bedrooms}
                onChange={(e) => set("bedrooms")(e.target.value)}
              >
                <option value="">— غير محدد —</option>
                {BEDROOM_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n === 0 ? "استوديو (بدون غرف)" : countLabel(n, BEDROOM_OPTIONS)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="عدد دورات المياه">
              <Select
                value={form.bathrooms}
                onChange={(e) => set("bathrooms")(e.target.value)}
              >
                <option value="">— غير محدد —</option>
                {BATHROOM_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {countLabel(n, BATHROOM_OPTIONS)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="عدد المواقف">
              <Select
                value={form.parking}
                onChange={(e) => set("parking")(e.target.value)}
              >
                <option value="">— غير محدد —</option>
                {PARKING_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n === 0 ? "لا توجد" : countLabel(n, PARKING_OPTIONS)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="سنة البناء">
              <Select
                value={form.yearBuilt}
                onChange={(e) => set("yearBuilt")(e.target.value)}
              >
                <option value="">— غير محدد —</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-5">
            <p className="mb-2.5 text-sm font-medium text-foreground">
              المرافق والمميزات
            </p>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
              {AMENITY_TOGGLES.map((amenity) => (
                <label
                  key={amenity.key}
                  className="flex h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form[amenity.key]}
                    onChange={(e) => set(amenity.key)(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]"
                  />
                  {amenity.label}
                </label>
              ))}
            </div>
          </div>
        </AccordionSection>

        {/* Location — cascading Saudi selects */}
        <AccordionSection
          title="الموقع الجغرافي"
          description="حدّد المنطقة والمدينة والحي، ثم اضغط على الخريطة لتثبيت موقع العقار بدقة."
          defaultOpen
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="الدولة">
              <Select value={SAUDI_COUNTRY.id} disabled>
                <option value={SAUDI_COUNTRY.id}>{SAUDI_COUNTRY.ar}</option>
              </Select>
            </Field>
            <Field label="المنطقة" required>
              <Select
                value={form.regionId}
                onChange={(e) => onRegionChange(e.target.value)}
                disabled={geoLoading}
              >
                {geoLoading && <option>جارٍ التحميل…</option>}
                {regions.map((r) => (
                  <option key={r.region_id} value={String(r.region_id)}>
                    {r.name_ar}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="المدينة" required>
              <Select
                value={form.cityId}
                onChange={(e) => onCityChange(e.target.value)}
                disabled={geoLoading}
              >
                {cityOptions.map((c) => (
                  <option key={c.city_id} value={String(c.city_id)}>
                    {c.name_ar}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="الحي"
              required={districtOptions.length > 0}
              error={submitted ? errors.district : undefined}
              hint={
                !geoLoading && districtOptions.length === 0
                  ? "لا توجد أحياء مسجّلة لهذه المدينة"
                  : undefined
              }
            >
              <Select
                value={form.districtId}
                onChange={(e) => set("districtId")(e.target.value)}
                disabled={geoLoading || districtOptions.length === 0}
                aria-invalid={Boolean(submitted && errors.district)}
              >
                <option value="">— اختر الحي —</option>
                {districtOptions.map((x) => (
                  <option key={x.district_id} value={String(x.district_id)}>
                    {x.name_ar}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="موقع العقار على الخريطة"
              className="md:col-span-2"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                {/* Map on the left, kept compact. */}
                <div className="h-[280px] w-full overflow-hidden rounded-xl border border-input md:w-[360px] md:shrink-0">
                  <LocationPicker
                    lat={form.mapLat}
                    lng={form.mapLng}
                    onChange={onPickLocation}
                    centerHint={cityCenter}
                    className="h-full w-full"
                  />
                </div>
                {/* Instructions + coordinate readout on the right. */}
                <div className="flex-1 space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    اضغط على الخريطة لتحديد موقع العقار، أو اسحب الدبوس لضبطه
                    بدقة. الخريطة مقصورة على المملكة العربية السعودية.
                  </p>
                  {form.mapLat != null && form.mapLng != null ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-600" dir="ltr">
                        ✓ {form.mapLat.toFixed(5)}, {form.mapLng.toFixed(5)}
                      </span>
                      <button
                        type="button"
                        onClick={clearPin}
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                      >
                        مسح الموقع
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      لم يتم تحديد موقع بعد — سيُستخدم مركز المدينة تلقائياً.
                    </p>
                  )}
                </div>
              </div>
            </Field>
          </div>
        </AccordionSection>

        {/* Contacts */}
        <AccordionSection
          title="بيانات التواصل"
          description="* إستخدم حروف وأرقام فقط"
        >
          <div className="space-y-3">
            {contacts.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/30 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
                <Input
                  value={row.name}
                  onChange={(e) =>
                    updateContact(index, "name", sanitizeAlnum(e.target.value))
                  }
                  placeholder="الإسم"
                  aria-label="الإسم"
                />
                <Input
                  value={row.role}
                  onChange={(e) =>
                    updateContact(index, "role", sanitizeAlnum(e.target.value))
                  }
                  placeholder="الصفة"
                  aria-label="الصفة"
                />
                <Input
                  value={row.phone}
                  onChange={(e) =>
                    updateContact(index, "phone", sanitizePhone(e.target.value))
                  }
                  placeholder="الهاتف"
                  inputMode="tel"
                  aria-label="الهاتف"
                />
                <Input
                  value={row.note}
                  onChange={(e) =>
                    updateContact(index, "note", sanitizeAlnum(e.target.value))
                  }
                  placeholder="ملاحظة"
                  aria-label="ملاحظة"
                />
                <button
                  type="button"
                  onClick={() =>
                    setContacts((prev) =>
                      prev.length === 1
                        ? [{ name: "", role: "", phone: "", note: "" }]
                        : prev.filter((_, i) => i !== index),
                    )
                  }
                  aria-label="حذف جهة الاتصال"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setContacts((prev) => [
                  ...prev,
                  { name: "", role: "", phone: "", note: "" },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              إضافة جهة اتصال
            </Button>
          </div>
        </AccordionSection>

        {/* Optional registry / deed details */}
        <AccordionSection
          title="المدخلات الاختيارية"
          description="بيانات الصك والعقار الإضافية"
        >
          {showConfidential && (
            <div className="mb-5 rounded-lg border border-amber-300/50 bg-amber-50/50 p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                بيانات المالك{" "}
                <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                  سرية — تظهر فقط للمصرّح لهم
                </span>
              </p>
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                <Field label="اسم المالك">
                  <Input
                    value={form.ownerName}
                    onChange={(e) =>
                      set("ownerName")(sanitizeAlnum(e.target.value))
                    }
                  />
                </Field>
                <Field label="جوال المالك">
                  <Input
                    value={form.ownerPhone}
                    onChange={(e) =>
                      set("ownerPhone")(sanitizePhone(e.target.value))
                    }
                    dir="ltr"
                    inputMode="tel"
                  />
                </Field>
                <Field label="هوية المالك (اختياري)">
                  <Input
                    value={form.ownerNationalId}
                    onChange={(e) =>
                      set("ownerNationalId")(sanitizeAlnum(e.target.value))
                    }
                    inputMode="numeric"
                  />
                </Field>
                <Field label="ملاحظة عن الملكية">
                  <Input
                    value={form.ownerNote}
                    onChange={(e) => set("ownerNote")(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            {showConfidential && (
              <Field label="رقم العقار">
                <Input
                  value={form.propertyNumber}
                  onChange={(e) => set("propertyNumber")(e.target.value)}
                />
              </Field>
            )}
            <Field label="اسم العقار باللغة الإنجليزية" className="md:col-span-2">
              <Input
                value={form.titleEn}
                onChange={(e) => set("titleEn")(e.target.value)}
                dir="ltr"
                placeholder="Property name in English"
              />
            </Field>
            {showConfidential && (
              <>
                <Field label="نوع صك الملكية">
                  <Input
                    value={form.deedType}
                    onChange={(e) => set("deedType")(e.target.value)}
                  />
                </Field>
                <Field label="رقم صك الملكية">
                  <Input
                    value={form.deedNumber}
                    onChange={(e) => set("deedNumber")(e.target.value)}
                  />
                </Field>
                <Field label="تاريخ إصدار صك الملكية (ميلادي)">
                  <Input
                    type="date"
                    value={form.deedIssueDate}
                    onChange={(e) => set("deedIssueDate")(e.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label="مساحة العقار (م²)">
              <Input
                value={form.propertyArea}
                onChange={(e) => set("propertyArea")(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="الرقم الإضافي">
              <Input
                value={form.additionalNumber1}
                onChange={(e) => set("additionalNumber1")(e.target.value)}
              />
            </Field>
            <Field label="الرقم الإضافي 2">
              <Input
                value={form.additionalNumber2}
                onChange={(e) => set("additionalNumber2")(e.target.value)}
              />
            </Field>
            <Field label="رقم قطعة العقار (اختياري)">
              <Input
                value={form.parcelNumber}
                onChange={(e) => set("parcelNumber")(e.target.value)}
              />
            </Field>
            <Field label="رقم المخطط (اختياري)">
              <Input
                value={form.planNumber}
                onChange={(e) => set("planNumber")(e.target.value)}
              />
            </Field>
            <Field label="رقم بلوك العقار">
              <Input
                value={form.blockNumber}
                onChange={(e) => set("blockNumber")(e.target.value)}
              />
            </Field>
            <Field label="تاريخ بناء العقار (ميلادي)">
              <Input
                type="date"
                value={form.buildDate}
                onChange={(e) => set("buildDate")(e.target.value)}
              />
            </Field>
            <Field label="عدد الطوابق في العقار">
              <Input
                value={form.floorsCount}
                onChange={(e) => set("floorsCount")(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="عدد الوحدات في كل طابق">
              <Input
                value={form.unitsPerFloor}
                onChange={(e) => set("unitsPerFloor")(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="رقم عداد الكهرباء">
              <Input
                value={form.electricityMeterNumber}
                onChange={(e) => set("electricityMeterNumber")(e.target.value)}
              />
            </Field>
            <Field label="رقم اشتراك الكهرباء">
              <Input
                value={form.electricitySubscriptionNumber}
                onChange={(e) =>
                  set("electricitySubscriptionNumber")(e.target.value)
                }
              />
            </Field>
            <Field label="رقم عداد المياه">
              <Input
                value={form.waterMeterNumber}
                onChange={(e) => set("waterMeterNumber")(e.target.value)}
              />
            </Field>
            <Field label="رقم الاشتراك في المياه">
              <Input
                value={form.waterSubscriptionNumber}
                onChange={(e) =>
                  set("waterSubscriptionNumber")(e.target.value)
                }
              />
            </Field>
            <Field label="إسم الشارع">
              <Input
                value={form.streetName}
                onChange={(e) => set("streetName")(e.target.value)}
              />
            </Field>
            <Field label="الرمز البريدي">
              <Input
                value={form.postalCode}
                onChange={(e) => set("postalCode")(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="رقم المبنى">
              <Input
                value={form.buildingNumber}
                onChange={(e) => set("buildingNumber")(e.target.value)}
              />
            </Field>
            <Field label="عقد الوساطة">
              <Input
                value={form.brokerageContract}
                onChange={(e) => set("brokerageContract")(e.target.value)}
              />
            </Field>
            {showConfidential && (
              <Field label="صك الملكية (مرجع)">
                <Input
                  value={form.deedReference}
                  onChange={(e) => set("deedReference")(e.target.value)}
                  placeholder="رقم أو مرجع الصك"
                />
              </Field>
            )}
            <Field label={t("listings.description")} className="md:col-span-2">
              <textarea
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                rows={3}
                className={textareaClasses}
              />
            </Field>
          </div>
        </AccordionSection>

        {/* Listing source (note 8) — internal classification */}
        <AccordionSection
          title="مصدر العقار"
          description="هل العقار مباشر من المالك أم عبر وسيط؟"
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="المصدر">
              <Select
                value={form.source}
                onChange={(e) =>
                  set("source")(e.target.value as ListingSource)
                }
              >
                <option value="owner">مباشر من المالك</option>
                <option value="broker">عبر وسيط / مكتب</option>
              </Select>
            </Field>
            {form.source === "broker" && (
              <>
                <Field label="اسم المكتب / الوكالة">
                  <Input
                    value={form.brokerAgencyName}
                    onChange={(e) =>
                      set("brokerAgencyName")(sanitizeAlnum(e.target.value))
                    }
                  />
                </Field>
                <Field label="اسم الوسيط">
                  <Input
                    value={form.brokerName}
                    onChange={(e) =>
                      set("brokerName")(sanitizeAlnum(e.target.value))
                    }
                  />
                </Field>
                <Field label="جوال الوسيط">
                  <Input
                    value={form.brokerPhone}
                    onChange={(e) =>
                      set("brokerPhone")(sanitizePhone(e.target.value))
                    }
                    dir="ltr"
                    inputMode="tel"
                  />
                </Field>
              </>
            )}
          </div>
        </AccordionSection>

        {/* Advertising publish checklist (note 9) */}
        <AccordionSection
          title="حالة النشر الإعلاني"
          description="أين تم نشر إعلان هذا العقار؟"
        >
          <div className="flex flex-wrap gap-2">
            {PUBLISH_PLATFORMS.map(({ key, label }) => {
              const field = (
                {
                  aqar: "pubAqar",
                  instagram: "pubInstagram",
                  x: "pubX",
                  facebook: "pubFacebook",
                  snapchat: "pubSnapchat",
                } as const
              )[key];
              const active = form[field];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set(field)(!active)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {active ? "✓ " : ""}
                  {label}
                </button>
              );
            })}
          </div>
        </AccordionSection>
      </Accordion>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => router.push(ROUTES.DASHBOARD_LISTINGS)}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (!isEdit && planAtLimit)}
        >
          {submitting
            ? t("common.saving")
            : isEdit
              ? t("common.save")
              : t("listings.createListing")}
        </Button>
      </div>
    </div>
  );
}
