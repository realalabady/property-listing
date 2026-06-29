"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
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
  priceNegotiable: boolean;
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
  priceNegotiable: false,
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
};

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
    priceNegotiable: Boolean(data.priceNegotiable),
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
        const mapped = listingDocToForm(snap.data() as Record<string, unknown>);
        setForm(mapped.form);
        setContacts(mapped.contacts);
        setPendingLoc(mapped.locationNames);
        setOriginalStatus(mapped.form.status);
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
    return details;
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
      const listingsRef = collection(db, `companies/${companyId}/listings`);

      const region = regions.find((r) => String(r.region_id) === form.regionId);
      const city = cities.find((c) => String(c.city_id) === form.cityId);
      const district = form.districtId
        ? districts.find((dd) => String(dd.district_id) === form.districtId)
        : undefined;
      // District coords aren't in the lite dataset → use the city center.
      const lat = city?.center?.[0] ?? null;
      const lng = city?.center?.[1] ?? null;
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
        },
        area: Number(form.area),
        areaUnit: "sqm",
        ...buildSpecs(isEdit),
        amenities: buildAmenities(),
        contacts: cleanContacts,
        details,
        status: form.status,
      };

      if (isEdit && listingId) {
        const updatePayload: Record<string, unknown> = {
          ...corePayload,
          updatedAt: serverTimestamp(),
        };
        // Stamp publishedAt only on the first transition into "published".
        if (
          form.status === LISTING_STATUSES.PUBLISHED &&
          originalStatus !== LISTING_STATUSES.PUBLISHED
        ) {
          updatePayload.publishedAt = serverTimestamp();
        }
        await updateDoc(
          doc(db, `companies/${companyId}/listings/${listingId}`),
          updatePayload,
        );
        router.push(ROUTES.DASHBOARD_LISTING_DETAIL(listingId));
        router.refresh();
        return;
      }

      await addDoc(listingsRef, {
        ...corePayload,
        media: [],
        coverImage: null,
        assignedEmployeeId: null,
        featured: false,
        publishedAt:
          form.status === LISTING_STATUSES.PUBLISHED ? serverTimestamp() : null,
        analytics: {
          views: 0,
          uniqueViews: 0,
          inquiries: 0,
          whatsappClicks: 0,
          phoneClicks: 0,
          favorites: 0,
        },
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

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
          description="حدّد الدولة ثم المنطقة فالمدينة فالحي — تُحدد إحداثيات العقار تلقائيًا على الخريطة."
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
            <Field label={t("listings.initialStatus")} className="md:col-span-2">
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
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
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
            <Field label="رقم العقار">
              <Input
                value={form.propertyNumber}
                onChange={(e) => set("propertyNumber")(e.target.value)}
              />
            </Field>
            <Field label="اسم العقار باللغة الإنجليزية" className="md:col-span-2">
              <Input
                value={form.titleEn}
                onChange={(e) => set("titleEn")(e.target.value)}
                dir="ltr"
                placeholder="Property name in English"
              />
            </Field>
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
            <Field label="رقم قطعة العقار">
              <Input
                value={form.parcelNumber}
                onChange={(e) => set("parcelNumber")(e.target.value)}
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
            <Field label="صك الملكية (مرجع)">
              <Input
                value={form.deedReference}
                onChange={(e) => set("deedReference")(e.target.value)}
                placeholder="رقم أو مرجع الصك"
              />
            </Field>
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
      </Accordion>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => router.push(ROUTES.DASHBOARD_LISTINGS)}
        >
          {t("common.cancel")}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={submitting}>
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
