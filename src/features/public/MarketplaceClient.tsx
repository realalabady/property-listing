"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
import { getGlobalListings, type PublicListing } from "./data";
import { ListingCard } from "./ListingCard";
import {
  applyFilters,
  CATEGORY_OPTIONS,
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToQuery,
  hasActiveFilters,
  type ListingFilters,
} from "./filters";
import {
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
  type ListingType,
} from "@/constants/listing-categories";
import {
  loadCities,
  loadDistricts,
  loadRegions,
  type GeoCity,
  type GeoDistrict,
  type GeoRegion,
} from "@/lib/geo/saudi-geo";
import { Combobox } from "@/components/ui/combobox";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/constants/roles";
import { logCustomerSearch } from "@/features/matching/logSearch";

const SaudiClusterMap = dynamic(() => import("./SaudiClusterMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-2xl bg-muted" />
  ),
});

const typeTabs: Array<{ value: ListingType | ""; label: string }> = [
  { value: "", label: "الكل" },
  { value: LISTING_TYPES.SALE, label: LISTING_TYPE_LABELS[LISTING_TYPES.SALE].ar },
  { value: LISTING_TYPES.RENT, label: LISTING_TYPE_LABELS[LISTING_TYPES.RENT].ar },
  {
    value: LISTING_TYPES.OFF_PLAN,
    label: LISTING_TYPE_LABELS[LISTING_TYPES.OFF_PLAN].ar,
  },
];

export function MarketplaceClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  // Filters are seeded from (and committed back to) the URL so links from the
  // landing-page search bar arrive pre-filtered and results stay shareable.
  const [filters, setFilters] = useState<ListingFilters>(EMPTY_FILTERS);

  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    getGlobalListings()
      .then((rows) => {
        if (!mounted) return;
        setListings(rows);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!mounted) return;
        setLoading(false);
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("marketplace.loadFailed"),
        );
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Saudi geography for the cascading location selects (same dataset the
  // property form uses, so filters match exactly what listings store).
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadRegions(), loadCities(), loadDistricts()])
      .then(([r, c, d]) => {
        if (!mounted) return;
        setRegions(r);
        setCities(c);
        setDistricts(d);
      })
      .catch(() => {
        /* geo is optional; selects simply stay empty */
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Selected geo entities are resolved from the stored (Arabic) names so the
  // cascade rebuilds correctly from a shared URL.
  const selectedRegion = useMemo(
    () => regions.find((r) => r.name_ar === filters.region),
    [regions, filters.region],
  );
  const cityOptions = useMemo(
    () =>
      selectedRegion
        ? cities.filter((c) => c.region_id === selectedRegion.region_id)
        : [],
    [cities, selectedRegion],
  );

  // Every city name (ar + en) in the selected region — lets region filtering
  // match a listing by city membership instead of an unreliable region string.
  const regionCities = useMemo(() => {
    if (!selectedRegion) return undefined;
    const set = new Set<string>();
    for (const c of cityOptions) {
      if (c.name_ar) set.add(c.name_ar.toLowerCase());
      if (c.name_en) set.add(c.name_en.toLowerCase());
    }
    return set;
  }, [selectedRegion, cityOptions]);

  const filtered = useMemo(
    () => applyFilters(listings, filters, { regionCities }),
    [listings, filters, regionCities],
  );
  const selectedCity = useMemo(
    () => cityOptions.find((c) => c.name_ar === filters.city),
    [cityOptions, filters.city],
  );
  const districtOptions = useMemo(
    () =>
      selectedCity
        ? districts.filter((d) => d.city_id === selectedCity.city_id)
        : [],
    [districts, selectedCity],
  );

  function update<K extends keyof ListingFilters>(
    key: K,
    value: ListingFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function commit(event?: FormEvent) {
    event?.preventDefault();
    router.push(`${pathname}${filtersToQuery(filters)}`, { scroll: false });
    // Registered customers' committed searches become matched-lead signals.
    if (user?.role === ROLES.CUSTOMER) {
      logCustomerSearch(filters);
    }
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
    router.push(pathname, { scroll: false });
  }

  const active = hasActiveFilters(filters);

  return (
    <main className="container-tight py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("marketplace.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("marketplace.subtitle")}
        </p>
      </header>

      {/* Map opens full-screen on demand (aqar-style) instead of taking the page */}
      <section className="mb-8">
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary/60"
        >
          <MapIcon className="h-4 w-4 text-primary" />
          عرض العقارات على الخريطة
        </button>
      </section>

      {mapOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapIcon className="h-4 w-4 text-primary" />
              خريطة العقارات في المملكة
              <span className="text-muted-foreground">({filtered.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setMapOpen(false)}
              aria-label="إغلاق الخريطة"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative flex-1">
            <SaudiClusterMap listings={filtered} />
          </div>
        </div>
      )}

      {/* Search + filters */}
      <form
        onSubmit={commit}
        className="mb-8 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        {/* Type tabs */}
        <div className="mb-3 flex flex-wrap gap-2">
          {typeTabs.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => update("type", tab.value)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                filters.type === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
          {/* Keyword */}
          <label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 lg:col-span-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="sr-only">{t("marketplace.searchPlaceholder")}</span>
            <input
              value={filters.q}
              onChange={(e) => update("q", e.target.value)}
              placeholder={t("marketplace.searchPlaceholder")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          {/* Category */}
          <Combobox
            aria-label="نوع العقار"
            className="lg:col-span-2"
            value={filters.category}
            placeholder="كل الأنواع"
            onChange={(v) => update("category", v as ListingFilters["category"])}
            options={CATEGORY_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.ar,
            }))}
          />
        </div>

        {/* Location: cascading Region → City → District (same dataset as the
            property form). Searchable comboboxes — type to filter or pick. */}
        <div className="mt-2.5 grid gap-2.5 md:grid-cols-3">
          <Combobox
            aria-label="المنطقة"
            value={filters.region}
            placeholder="كل المناطق"
            searchPlaceholder="ابحث عن منطقة…"
            options={regions.map((r) => ({
              value: r.name_ar,
              label: r.name_ar,
            }))}
            onChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                region: v,
                city: "",
                district: "",
              }))
            }
          />

          <Combobox
            aria-label="المدينة"
            value={filters.city}
            placeholder={selectedRegion ? "كل المدن" : "اختر المنطقة أولاً"}
            searchPlaceholder="ابحث عن مدينة…"
            disabled={!selectedRegion}
            options={cityOptions.map((c) => ({
              value: c.name_ar,
              label: c.name_ar,
            }))}
            onChange={(v) =>
              setFilters((prev) => ({ ...prev, city: v, district: "" }))
            }
          />

          <Combobox
            aria-label="الحي"
            value={filters.district}
            placeholder={
              selectedCity
                ? districtOptions.length > 0
                  ? "كل الأحياء"
                  : "لا توجد أحياء"
                : "اختر المدينة أولاً"
            }
            searchPlaceholder="ابحث عن حي…"
            disabled={!selectedCity || districtOptions.length === 0}
            options={districtOptions.map((d) => ({
              value: d.name_ar,
              label: d.name_ar,
            }))}
            onChange={(v) => update("district", v)}
          />
        </div>

        {/* Secondary numeric filters */}
        <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="أقل سعر"
            placeholder="٠"
            value={filters.minPrice}
            onChange={(v) => update("minPrice", v)}
          />
          <NumberField
            label="أعلى سعر"
            placeholder="بدون حد"
            value={filters.maxPrice}
            onChange={(v) => update("maxPrice", v)}
          />
          <BedroomsSelect
            value={filters.bedrooms}
            onChange={(v) => update("bedrooms", v)}
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <SlidersHorizontal className="h-4 w-4" />
              تطبيق
            </button>
            {active && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
                مسح
              </button>
            )}
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">{t("marketplace.loading")}</p>
      )}

      {!loading && !error && (
        <p className="mb-4 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "عقار" : "عقار"}
          {active ? " مطابق لبحثك" : ""}
        </p>
      )}

      {!loading && filtered.length === 0 && !error && (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {t("marketplace.empty")}
        </p>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </section>
    </main>
  );
}

function NumberField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3">
      {/* Visible, persistent label so each numeric field is never ambiguous. */}
      <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        aria-label={label}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-end text-sm outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  );
}

// Constrained minimum-bedrooms dropdown — mirrors the property form's bedroom
// options so searches produce clean integers that match listing data exactly.
function BedroomsSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3">
      <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
        أقل عدد غرف
      </span>
      <select
        aria-label="أقل عدد غرف"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="w-full min-w-0 cursor-pointer bg-transparent text-end text-sm outline-none"
      >
        <option value="">أي عدد</option>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <option key={n} value={n}>
            {n === 10 ? "10+" : `${n}+`}
          </option>
        ))}
      </select>
    </label>
  );
}
