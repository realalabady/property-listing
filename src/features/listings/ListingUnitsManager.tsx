"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";
import type {
  ListingUnit,
  ListingUnitStatus,
  ListingUnitType,
} from "@/types/listing";

interface ListingUnitsManagerProps {
  companyId: string;
  listingId: string;
  canEdit: boolean;
  /** Parent listing type — a new unit defaults to it (usually what's wanted). */
  defaultType?: ListingUnitType;
  /**
   * How many units the parent's denormalized `publicUnits` array currently
   * holds. Used to detect drift (e.g. units saved before that field existed)
   * and self-heal it, so nobody has to re-save units by hand.
   */
  publicUnitsCount?: number;
}

interface UnitForm {
  label: string;
  type: ListingUnitType;
  status: ListingUnitStatus;
  price: string;
  rentPeriod: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  livingRooms: string;
  kitchens: string;
  majlis: string;
  floor: string;
  furnished: boolean;
  description: string;
  images: string[];
  imagePaths: string[];
  tenantName: string;
  tenantPhone: string;
  tenantLeaseEndsAt: string;
}

/** Cap what we denormalize onto the parent doc (Firestore's 1MB limit). */
const MAX_PUBLIC_UNITS = 40;
const MAX_IMAGES_PER_UNIT = 6;

const emptyForm = (type: ListingUnitType): UnitForm => ({
  label: "",
  type,
  status: "available",
  price: "",
  rentPeriod: "monthly",
  area: "",
  bedrooms: "",
  bathrooms: "",
  livingRooms: "",
  kitchens: "",
  majlis: "",
  floor: "",
  furnished: false,
  description: "",
  images: [],
  imagePaths: [],
  tenantName: "",
  tenantPhone: "",
  tenantLeaseEndsAt: "",
});

const RENT_PERIODS = [
  { value: "monthly", label: "شهري" },
  { value: "yearly", label: "سنوي" },
  { value: "daily", label: "يومي" },
];

// Constrained numeric option lists — dropdowns instead of free text so the
// stored values are always clean integers (mirrors the main listing form).
const BEDROOM_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BATHROOM_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const ROOM_OPTIONS = [0, 1, 2, 3, 4, 5];
const FLOOR_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** The "taken" status for a unit depends on whether it's for sale or rent. */
function takenStatus(type: ListingUnitType): ListingUnitStatus {
  return type === "sale" ? "sold" : "rented";
}

const sanitizeAlnum = (value: string) => value.replace(/[^\p{L}\p{N}\s]/gu, "");
const sanitizePhone = (value: string) => value.replace(/[^\d+\-\s]/g, "");
const sanitizeDigits = (value: string) => value.replace(/[^\d]/g, "");

function numOrNull(value: string): number | null {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) ? n : null;
}

function unitToForm(unit: ListingUnit): UnitForm {
  const type: ListingUnitType = unit.type === "sale" ? "sale" : "rent";
  return {
    label: unit.label ?? "",
    type,
    status: unit.status === "available" ? "available" : takenStatus(type),
    price: typeof unit.price === "number" ? String(unit.price) : "",
    rentPeriod: unit.rentPeriod ?? "monthly",
    area: typeof unit.area === "number" ? String(unit.area) : "",
    bedrooms: typeof unit.bedrooms === "number" ? String(unit.bedrooms) : "",
    bathrooms: typeof unit.bathrooms === "number" ? String(unit.bathrooms) : "",
    livingRooms:
      typeof unit.livingRooms === "number" ? String(unit.livingRooms) : "",
    kitchens: typeof unit.kitchens === "number" ? String(unit.kitchens) : "",
    majlis: typeof unit.majlis === "number" ? String(unit.majlis) : "",
    floor: typeof unit.floor === "number" ? String(unit.floor) : "",
    furnished: unit.furnished === true,
    description: unit.description ?? "",
    images: Array.isArray(unit.images) ? unit.images : [],
    imagePaths: Array.isArray(unit.imagePaths) ? unit.imagePaths : [],
    tenantName: unit.tenant?.name ?? "",
    tenantPhone: unit.tenant?.phone ?? "",
    tenantLeaseEndsAt: unit.tenant?.leaseEndsAt ?? "",
  };
}

/**
 * Manage the independently rentable units inside one listing (note 6):
 * one building listing with N unit docs, each with its own status, price and
 * tenant — instead of creating N near-duplicate listings.
 *
 * Every write recomputes the parent listing's `unitsSummary` so the public
 * marketplace can show "X units available" + a price range without ever
 * reading the (internal) units subcollection.
 */
export function ListingUnitsManager({
  companyId,
  listingId,
  canEdit,
  defaultType = "rent",
  publicUnitsCount,
}: ListingUnitsManagerProps) {
  const [units, setUnits] = useState<ListingUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<UnitForm>(emptyForm(defaultType));

  const unitsPath = `companies/${companyId}/listings/${listingId}/units`;

  useEffect(() => {
    const unsub = onSnapshot(
      collection(getFirebaseDb(), unitsPath),
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const type: ListingUnitType = data.type === "sale" ? "sale" : "rent";
          return {
            id: d.id,
            label: typeof data.label === "string" ? data.label : "",
            type,
            status:
              data.status === "available" ? "available" : takenStatus(type),
            price: typeof data.price === "number" ? data.price : 0,
            rentPeriod:
              typeof data.rentPeriod === "string" ? data.rentPeriod : null,
            area: typeof data.area === "number" ? data.area : null,
            bedrooms: typeof data.bedrooms === "number" ? data.bedrooms : null,
            bathrooms:
              typeof data.bathrooms === "number" ? data.bathrooms : null,
            livingRooms:
              typeof data.livingRooms === "number" ? data.livingRooms : null,
            kitchens: typeof data.kitchens === "number" ? data.kitchens : null,
            majlis: typeof data.majlis === "number" ? data.majlis : null,
            floor: typeof data.floor === "number" ? data.floor : null,
            furnished: data.furnished === true,
            images: Array.isArray(data.images)
              ? (data.images.filter((u) => typeof u === "string") as string[])
              : [],
            imagePaths: Array.isArray(data.imagePaths)
              ? (data.imagePaths.filter(
                  (p) => typeof p === "string",
                ) as string[])
              : [],
            description:
              typeof data.description === "string" ? data.description : "",
            tenant:
              typeof data.tenant === "object" && data.tenant !== null
                ? (data.tenant as ListingUnit["tenant"])
                : null,
          } satisfies ListingUnit;
        });
        rows.sort((a, b) => a.label.localeCompare(b.label, "ar"));
        setUnits(rows);
        setLoading(false);
      },
      (snapError) => {
        setError(snapError.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [unitsPath]);

  const summary = useMemo(() => {
    const available = units.filter((u) => u.status === "available");
    const prices = available.map((u) => u.price).filter((p) => p > 0);
    return {
      total: units.length,
      available: available.length,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
      maxPrice: prices.length > 0 ? Math.max(...prices) : null,
    };
  }, [units]);

  /**
   * Self-heal the parent's denormalized rollup.
   *
   * `publicUnits` / `unitsSummary` are only written when a unit is saved, so a
   * listing whose units predate those fields (or drifted for any other reason)
   * would show a unit count with no unit details — and the public popup would
   * be empty. Rather than make someone re-save every unit by hand, an editor
   * simply opening the listing repairs it. Runs at most once per mount, and
   * only when the stored count actually disagrees with reality.
   */
  const healedRef = useRef(false);
  useEffect(() => {
    if (!canEdit || loading || healedRef.current) return;
    if (publicUnitsCount === undefined) return;
    if (summary.available === publicUnitsCount) return;
    healedRef.current = true;
    void recomputeSummary().catch(() => {
      // Best-effort: a failure here just leaves the popup unavailable.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, loading, publicUnitsCount, summary.available]);

  /**
   * Recompute the parent listing's rollup from the authoritative server state
   * (not local state) so a concurrent edit by a teammate can't be clobbered.
   */
  async function recomputeSummary() {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, unitsPath));
    let total = 0;
    let available = 0;
    let anyFurnished = false;
    const prices: number[] = [];
    const bedrooms: number[] = [];
    const areas: number[] = [];
    const livingRooms: number[] = [];
    const publicUnits: Record<string, unknown>[] = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      total += 1;
      // Only "available" counts — a rented OR sold unit is not on offer, and
      // its specs must not leak into what the marketplace advertises.
      if (data.status === "available") {
        available += 1;
        if (typeof data.price === "number" && data.price > 0) {
          prices.push(data.price);
        }
        if (typeof data.bedrooms === "number") bedrooms.push(data.bedrooms);
        if (typeof data.area === "number" && data.area > 0) {
          areas.push(data.area);
        }
        if (typeof data.livingRooms === "number") {
          livingRooms.push(data.livingRooms);
        }
        if (data.furnished === true) anyFurnished = true;

        // Public projection: available units only, and NEVER the tenant/buyer
        // block — this array is mirrored to the public marketplace.
        if (publicUnits.length < MAX_PUBLIC_UNITS) {
          const num = (v: unknown) => (typeof v === "number" ? v : null);
          publicUnits.push({
            id: d.id,
            label: typeof data.label === "string" ? data.label : "",
            type: data.type === "sale" ? "sale" : "rent",
            price: typeof data.price === "number" ? data.price : 0,
            rentPeriod:
              typeof data.rentPeriod === "string" ? data.rentPeriod : null,
            area: num(data.area),
            bedrooms: num(data.bedrooms),
            bathrooms: num(data.bathrooms),
            livingRooms: num(data.livingRooms),
            kitchens: num(data.kitchens),
            majlis: num(data.majlis),
            floor: num(data.floor),
            furnished: data.furnished === true,
            description:
              typeof data.description === "string" ? data.description : "",
            images: Array.isArray(data.images)
              ? data.images
                  .filter((u): u is string => typeof u === "string")
                  .slice(0, MAX_IMAGES_PER_UNIT)
              : [],
          });
        }
      }
    });

    const range = (values: number[]) =>
      values.length > 0
        ? { min: Math.min(...values), max: Math.max(...values) }
        : null;
    const priceRange = range(prices);
    const bedroomRange = range(bedrooms);
    const areaRange = range(areas);

    await updateDoc(doc(db, `companies/${companyId}/listings/${listingId}`), {
      unitsSummary: {
        total,
        available,
        minPrice: priceRange?.min ?? null,
        maxPrice: priceRange?.max ?? null,
        bedroomsMin: bedroomRange?.min ?? null,
        bedroomsMax: bedroomRange?.max ?? null,
        areaMin: areaRange?.min ?? null,
        areaMax: areaRange?.max ?? null,
        livingRoomsMax:
          livingRooms.length > 0 ? Math.max(...livingRooms) : null,
        anyFurnished,
      },
      publicUnits,
      updatedAt: serverTimestamp(),
    });
  }

  function startAdd() {
    setForm(emptyForm(defaultType));
    setEditingId(null);
    setAdding(true);
    setError(null);
  }

  /**
   * Upload unit photos. They land under the listing's existing media path, so
   * the current Storage rules (public read, editor write) already cover them.
   */
  async function uploadImages(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const room = MAX_IMAGES_PER_UNIT - form.images.length;
    if (room <= 0) {
      setError(t("units.tooManyImages", { max: MAX_IMAGES_PER_UNIT }));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const storage = getFirebaseStorage();
      const urls: string[] = [];
      const paths: string[] = [];
      for (const file of files.slice(0, room)) {
        // SVG is blocked platform-wide (script-capable on a public path).
        if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
          continue;
        }
        if (file.size > 10 * 1024 * 1024) continue;
        const safeName = file.name
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, "-")
          .replace(/-+/g, "-");
        const path = `companies/${companyId}/listings/${listingId}/units/${Date.now()}-${safeName}`;
        const objectRef = ref(storage, path);
        await uploadBytes(objectRef, file, { contentType: file.type });
        urls.push(await getDownloadURL(objectRef));
        paths.push(path);
      }
      setForm((p) => ({
        ...p,
        images: [...p.images, ...urls],
        imagePaths: [...p.imagePaths, ...paths],
      }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("units.imageUploadFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  function removeImage(index: number) {
    setForm((p) => ({
      ...p,
      images: p.images.filter((_, i) => i !== index),
      imagePaths: p.imagePaths.filter((_, i) => i !== index),
    }));
  }

  /** Switching sale/rent must re-map the status onto that type's vocabulary. */
  function changeType(next: ListingUnitType) {
    setForm((p) => ({
      ...p,
      type: next,
      status: p.status === "available" ? "available" : takenStatus(next),
    }));
  }

  function startEdit(unit: ListingUnit) {
    setForm(unitToForm(unit));
    setEditingId(unit.id);
    setAdding(false);
    setError(null);
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm(defaultType));
  }

  function buildPayload(): Record<string, unknown> | null {
    const label = form.label.trim();
    const price = numOrNull(form.price);
    if (!label) {
      setError(t("units.labelRequired"));
      return null;
    }
    if (price === null || price <= 0) {
      setError(t("units.priceRequired"));
      return null;
    }

    // Person details only matter once the unit is taken (rented or sold);
    // clear them otherwise so a freed unit never keeps the old occupant's data.
    const isTaken = form.status !== "available";
    const tenant =
      isTaken && (form.tenantName.trim() || form.tenantPhone.trim())
        ? {
            ...(form.tenantName.trim() ? { name: form.tenantName.trim() } : {}),
            ...(form.tenantPhone.trim()
              ? { phone: form.tenantPhone.trim() }
              : {}),
            // Lease end is rent-only — a sale has no contract end date.
            ...(form.type === "rent" && form.tenantLeaseEndsAt.trim()
              ? { leaseEndsAt: form.tenantLeaseEndsAt.trim() }
              : {}),
          }
        : null;

    return {
      label,
      type: form.type,
      status: form.status,
      price,
      // A sale price has no period.
      rentPeriod: form.type === "rent" ? form.rentPeriod || null : null,
      area: numOrNull(form.area),
      bedrooms: numOrNull(form.bedrooms),
      bathrooms: numOrNull(form.bathrooms),
      livingRooms: numOrNull(form.livingRooms),
      kitchens: numOrNull(form.kitchens),
      majlis: numOrNull(form.majlis),
      floor: numOrNull(form.floor),
      furnished: form.furnished,
      description: form.description.trim(),
      images: form.images,
      imagePaths: form.imagePaths,
      tenant,
      updatedAt: serverTimestamp(),
    };
  }

  async function save() {
    const payload = buildPayload();
    if (!payload) return;

    setBusy(true);
    setError(null);
    try {
      const db = getFirebaseDb();
      if (editingId) {
        await updateDoc(doc(db, `${unitsPath}/${editingId}`), payload);
      } else {
        await addDoc(collection(db, unitsPath), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await recomputeSummary();
      cancelForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t("units.saveFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(unitId: string) {
    if (!window.confirm(t("units.deleteConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDoc(doc(getFirebaseDb(), `${unitsPath}/${unitId}`));
      await recomputeSummary();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("units.deleteFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  const showForm = adding || editingId !== null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{t("units.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {units.length > 0
              ? t("units.summaryLine", {
                  total: summary.total,
                  available: summary.available,
                })
              : t("units.subtitle")}
          </p>
        </div>
        {canEdit && !showForm && (
          <Button type="button" size="sm" onClick={startAdd}>
            <Plus className="h-4 w-4" />
            {t("units.addUnit")}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-5 rounded-lg border border-border bg-background p-4">
          <p className="mb-3 text-sm font-semibold">
            {editingId ? t("units.editUnit") : t("units.newUnit")}
          </p>
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label={t("units.label")}>
              <Input
                value={form.label}
                onChange={(e) =>
                  setForm((p) => ({ ...p, label: sanitizeAlnum(e.target.value) }))
                }
                placeholder={t("units.labelPlaceholder")}
              />
            </Field>
            <Field label={t("units.type")}>
              <Select
                value={form.type}
                onChange={(e) => changeType(e.target.value as ListingUnitType)}
              >
                <option value="rent">{t("units.typeRent")}</option>
                <option value="sale">{t("units.typeSale")}</option>
              </Select>
            </Field>
            <Field label={t("common.status")}>
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as ListingUnitStatus,
                  }))
                }
              >
                <option value="available">{t("units.statusAvailable")}</option>
                <option value={takenStatus(form.type)}>
                  {form.type === "sale"
                    ? t("units.statusSold")
                    : t("units.statusRented")}
                </option>
              </Select>
            </Field>
            <Field
              label={
                form.type === "sale" ? t("units.salePrice") : t("units.price")
              }
            >
              <Input
                value={form.price}
                onChange={(e) =>
                  setForm((p) => ({ ...p, price: sanitizeDigits(e.target.value) }))
                }
                inputMode="numeric"
              />
            </Field>
            {form.type === "rent" && (
              <Field label={t("units.rentPeriod")}>
                <Select
                  value={form.rentPeriod}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rentPeriod: e.target.value }))
                  }
                >
                  {RENT_PERIODS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label={t("units.area")}>
              <Input
                value={form.area}
                onChange={(e) =>
                  setForm((p) => ({ ...p, area: sanitizeDigits(e.target.value) }))
                }
                inputMode="numeric"
              />
            </Field>
            <Field label={t("units.bedrooms")}>
              <Select
                value={form.bedrooms}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bedrooms: e.target.value }))
                }
              >
                <option value="">— {t("units.notSpecified")} —</option>
                {BEDROOM_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n === BEDROOM_OPTIONS[BEDROOM_OPTIONS.length - 1]
                      ? `${n}+`
                      : n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("units.bathrooms")}>
              <Select
                value={form.bathrooms}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bathrooms: e.target.value }))
                }
              >
                <option value="">— {t("units.notSpecified")} —</option>
                {BATHROOM_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n === BATHROOM_OPTIONS[BATHROOM_OPTIONS.length - 1]
                      ? `${n}+`
                      : n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("units.livingRooms")}>
              <Select
                value={form.livingRooms}
                onChange={(e) =>
                  setForm((p) => ({ ...p, livingRooms: e.target.value }))
                }
              >
                <option value="">— {t("units.notSpecified")} —</option>
                {ROOM_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n === ROOM_OPTIONS[ROOM_OPTIONS.length - 1] ? `${n}+` : n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("units.majlis")}>
              <Select
                value={form.majlis}
                onChange={(e) =>
                  setForm((p) => ({ ...p, majlis: e.target.value }))
                }
              >
                <option value="">— {t("units.notSpecified")} —</option>
                {ROOM_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n === ROOM_OPTIONS[ROOM_OPTIONS.length - 1] ? `${n}+` : n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("units.kitchens")}>
              <Select
                value={form.kitchens}
                onChange={(e) =>
                  setForm((p) => ({ ...p, kitchens: e.target.value }))
                }
              >
                <option value="">— {t("units.notSpecified")} —</option>
                {ROOM_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n === ROOM_OPTIONS[ROOM_OPTIONS.length - 1] ? `${n}+` : n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("units.floor")}>
              <Select
                value={form.floor}
                onChange={(e) =>
                  setForm((p) => ({ ...p, floor: e.target.value }))
                }
              >
                <option value="">— {t("units.notSpecified")} —</option>
                {FLOOR_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>
                    {n === 0 ? t("units.groundFloor") : n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("units.furnished")}>
              <Select
                value={form.furnished ? "yes" : "no"}
                onChange={(e) =>
                  setForm((p) => ({ ...p, furnished: e.target.value === "yes" }))
                }
              >
                <option value="no">{t("common.no")}</option>
                <option value="yes">{t("common.yes")}</option>
              </Select>
            </Field>
            <Field label={t("units.description")} className="md:col-span-2">
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </Field>

            {/* Unit photos — shown on the public unit popup once published. */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                {t("units.images")}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {form.images.map((url, i) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded-md border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -end-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {form.images.length < MAX_IMAGES_PER_UNIT && (
                  <label
                    className={cn(
                      "flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary",
                      busy && "pointer-events-none opacity-50",
                    )}
                  >
                    <Plus className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        void uploadImages(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("units.imagesHint", { max: MAX_IMAGES_PER_UNIT })}
              </p>
            </div>

            {form.status !== "available" && (
              <>
                <Field
                  label={
                    form.type === "sale"
                      ? t("units.buyerName")
                      : t("units.tenantName")
                  }
                >
                  <Input
                    value={form.tenantName}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        tenantName: sanitizeAlnum(e.target.value),
                      }))
                    }
                  />
                </Field>
                <Field
                  label={
                    form.type === "sale"
                      ? t("units.buyerPhone")
                      : t("units.tenantPhone")
                  }
                >
                  <Input
                    value={form.tenantPhone}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        tenantPhone: sanitizePhone(e.target.value),
                      }))
                    }
                    dir="ltr"
                    inputMode="tel"
                  />
                </Field>
                {/* Lease end only applies to a rental contract. */}
                {form.type === "rent" && (
                  <Field label={t("units.leaseEndsAt")}>
                    <Input
                      type="date"
                      value={form.tenantLeaseEndsAt}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          tenantLeaseEndsAt: e.target.value,
                        }))
                      }
                    />
                  </Field>
                )}
              </>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelForm}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={busy}>
              {busy ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}

      {!loading && units.length === 0 && !showForm && (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {t("units.empty")}
        </p>
      )}

      {units.length > 0 && (
        <div className="space-y-2">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {unit.label}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {unit.type === "sale"
                      ? t("units.typeSale")
                      : t("units.typeRent")}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      unit.status === "available"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900",
                    )}
                  >
                    {unit.status === "available"
                      ? t("units.statusAvailable")
                      : unit.status === "sold"
                        ? t("units.statusSold")
                        : t("units.statusRented")}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {unit.price.toLocaleString("en-US")} {t("units.sar")}
                  {unit.area ? ` • ${unit.area} م²` : ""}
                  {unit.bedrooms != null ? ` • ${unit.bedrooms} غرف` : ""}
                  {unit.livingRooms != null
                    ? ` • ${unit.livingRooms} صالة`
                    : ""}
                  {unit.majlis != null ? ` • ${unit.majlis} مجلس` : ""}
                  {unit.floor != null
                    ? ` • ${unit.floor === 0 ? t("units.groundFloor") : `الدور ${unit.floor}`}`
                    : ""}
                  {unit.furnished ? ` • ${t("units.furnishedShort")}` : ""}
                </p>
                {unit.status !== "available" && unit.tenant?.name && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {unit.type === "sale"
                      ? t("units.buyerName")
                      : t("units.tenantName")}
                    : {unit.tenant.name}
                    {unit.tenant.phone ? ` — ${unit.tenant.phone}` : ""}
                  </p>
                )}
              </div>

              {canEdit && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(unit)}
                    disabled={busy}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(unit.id)}
                    disabled={busy}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
