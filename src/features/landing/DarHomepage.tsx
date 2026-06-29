"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Building2,
  Globe,
  Home,
  KeyRound,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
  type ListingType,
} from "@/constants/listing-categories";
import { cn } from "@/lib/utils/cn";
import { getGlobalListings, type PublicListing } from "@/features/public/data";
import { ListingCard } from "@/features/public/ListingCard";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/constants/roles";
import { logCustomerSearch } from "@/features/matching/logSearch";
import { PropertyRequestModal } from "./PropertyRequestModal";

const SaudiClusterMap = dynamic(
  () => import("@/features/public/SaudiClusterMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-2xl bg-muted" />
    ),
  },
);
import {
  CATEGORY_OPTIONS,
  EMPTY_FILTERS,
  filtersToQuery,
  SAUDI_CITIES,
  type ListingFilters,
} from "@/features/public/filters";

type Locale = "ar" | "en";
type Localized = { ar: string; en: string };

const tr = (value: Localized, locale: Locale) => value[locale];

const brand: Localized = { ar: "دار", en: "Dar" };
const brandTagline: Localized = {
  ar: "ابحث عن عقارك التالي",
  en: "Find your next property",
};

const navLinks: Array<{ href: string; label: Localized }> = [
  { href: ROUTES.MARKETPLACE, label: { ar: "العقارات", en: "Properties" } },
  { href: "#how", label: { ar: "كيف يعمل", en: "How it works" } },
  { href: "#companies", label: { ar: "للشركات", en: "For agencies" } },
];

const heroTitle: Localized = {
  ar: "عقارك المثالي يبدأ بعملية بحث واحدة",
  en: "Your perfect property starts with one search",
};
const heroBody: Localized = {
  ar: "تصفّح آلاف العقارات الموثقة للبيع والإيجار في جميع مدن المملكة، بحث بسيط وسريع ونتائج واضحة.",
  en: "Browse thousands of verified homes for sale and rent across Saudi Arabia — simple search, clear results.",
};

const typeTabs: Array<{ value: ListingType; label: Localized }> = [
  { value: LISTING_TYPES.SALE, label: LISTING_TYPE_LABELS[LISTING_TYPES.SALE] },
  { value: LISTING_TYPES.RENT, label: LISTING_TYPE_LABELS[LISTING_TYPES.RENT] },
  {
    value: LISTING_TYPES.OFF_PLAN,
    label: LISTING_TYPE_LABELS[LISTING_TYPES.OFF_PLAN],
  },
];

const valueProps: Array<{
  icon: typeof ShieldCheck;
  title: Localized;
  body: Localized;
}> = [
  {
    icon: ShieldCheck,
    title: { ar: "عقارات موثقة", en: "Verified listings" },
    body: {
      ar: "كل عقار يُنشر من شركة عقارية مسجّلة على المنصة.",
      en: "Every property is published by a registered agency.",
    },
  },
  {
    icon: Search,
    title: { ar: "بحث بسيط", en: "Simple search" },
    body: {
      ar: "حدّد المدينة والنوع والميزانية واحصل على النتائج فورًا.",
      en: "Pick a city, type and budget — get results instantly.",
    },
  },
  {
    icon: KeyRound,
    title: { ar: "تواصل مباشر", en: "Direct contact" },
    body: {
      ar: "تواصل مع الشركة المالكة للعقار بدون وسطاء إضافيين.",
      en: "Reach the listing agency directly, no extra middlemen.",
    },
  },
];

const steps: Array<{ title: Localized; body: Localized }> = [
  {
    title: { ar: "ابحث", en: "Search" },
    body: {
      ar: "اختر المدينة ونوع العقار من شريط البحث.",
      en: "Choose a city and property type from the search bar.",
    },
  },
  {
    title: { ar: "قارن", en: "Compare" },
    body: {
      ar: "تصفّح العقارات المطابقة مع الأسعار والمساحات.",
      en: "Browse matching properties with prices and areas.",
    },
  },
  {
    title: { ar: "تواصل", en: "Connect" },
    body: {
      ar: "تواصل مع الشركة وأكمل الصفقة بثقة.",
      en: "Contact the agency and close with confidence.",
    },
  },
];

export function DarHomepage() {
  const router = useRouter();
  const { user } = useAuth();
  const [locale, setLocale] = useState<Locale>("ar");
  const [requestOpen, setRequestOpen] = useState(false);
  const isArabic = locale === "ar";
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  // Search state (wired to the real /properties page).
  const [type, setType] = useState<ListingType>(LISTING_TYPES.SALE);
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [keyword, setKeyword] = useState("");

  // Featured listings — real data, not mock cards.
  const [featured, setFeatured] = useState<PublicListing[]>([]);
  const [allListings, setAllListings] = useState<PublicListing[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    let mounted = true;
    getGlobalListings()
      .then((rows) => {
        if (!mounted) return;
        setAllListings(rows);
        setFeatured(rows.slice(0, 6));
      })
      .catch(() => {
        /* keep section empty on failure */
      })
      .finally(() => {
        if (mounted) setLoadingFeatured(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function runSearch(event: FormEvent) {
    event.preventDefault();
    const searchFilters: ListingFilters = {
      ...EMPTY_FILTERS,
      type,
      city,
      category: category as ListingFilters["category"],
      q: keyword,
    };
    // Registered customers' committed searches become matched-lead signals.
    if (user?.role === ROLES.CUSTOMER) {
      logCustomerSearch(searchFilters);
    }
    router.push(`${ROUTES.MARKETPLACE}${filtersToQuery(searchFilters)}`);
  }

  return (
    <div
      lang={locale}
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        fontFamily: isArabic ? "var(--font-arabic)" : "var(--font-sans)",
      }}
      className="dar-light min-h-screen bg-background text-foreground"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="container-tight flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Home className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight">
                {tr(brand, locale)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {tr(brandTagline, locale)}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {tr(item.label, locale)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocale((p) => (p === "ar" ? "en" : "ar"))}
              className="gap-1.5"
            >
              <Globe className="h-4 w-4" />
              {isArabic ? "EN" : "AR"}
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href={ROUTES.LOGIN}>{isArabic ? "تسجيل الدخول" : "Sign in"}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
            >
              <Link href={ROUTES.LOGIN}>
                {isArabic ? "أضف عقارك" : "List property"}
              </Link>
            </Button>
            <Button size="sm" onClick={() => setRequestOpen(true)}>
              {isArabic ? "اطلب عقارك" : "Request property"}
            </Button>
          </div>
        </div>
      </header>

      <PropertyRequestModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        locale={locale}
      />

      <main>
        {/* Hero + search */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,hsl(var(--secondary)),transparent_55%)]" />
          <div className="container-tight pb-10 pt-16 md:pt-24">
            {/* Centered hero copy */}
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                {tr(heroTitle, locale)}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {tr(heroBody, locale)}
              </p>
            </div>

            {/* Two-path chooser — make "Request a property" obvious, above search */}
            <div className="mx-auto mt-9 flex max-w-md flex-col items-center gap-2 text-center">
              <Button
                size="lg"
                onClick={() => setRequestOpen(true)}
                className="rounded-full px-8 text-base shadow-md"
              >
                {isArabic ? "اطلب عقارك" : "Request a property"}
              </Button>
              <ArrowUp className="animate-bounce-up h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">
                {isArabic
                  ? "أخبرنا بما تريد ويصلك العرض من الشركات العقارية"
                  : "Tell us what you need — agencies come to you"}
              </p>

              <div className="my-1 flex w-full items-center gap-3 text-sm font-bold text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {isArabic ? "أو" : "or"}
                <span className="h-px flex-1 bg-border" />
              </div>

              <p className="text-base font-bold text-foreground">
                {isArabic ? "ابحث عن عقارك" : "Search for your property"}
              </p>
              <ArrowDown className="animate-bounce-down h-5 w-5 text-primary" />
            </div>

            {/* Functional search bar (full width, like every property portal) */}
            <form
              onSubmit={runSearch}
              className="mx-auto mt-4 max-w-5xl rounded-2xl border border-border bg-card p-3 text-start shadow-lg shadow-black/[0.04] md:p-4"
            >
              {/* Type tabs */}
              <div className="mb-3 flex flex-wrap gap-2">
                {typeTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setType(tab.value)}
                    className={cn(
                      "cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                      type === tab.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
                    )}
                  >
                    {tr(tab.label, locale)}
                  </button>
                ))}
              </div>

              <div className="grid gap-2.5 md:grid-cols-[1.4fr_1fr_1fr_auto]">
                {/* City */}
                <label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="sr-only">{isArabic ? "المدينة" : "City"}</span>
                  <input
                    list="dar-cities"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={isArabic ? "المدينة أو الحي" : "City or district"}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <datalist id="dar-cities">
                    {SAUDI_CITIES.map((c) => (
                      <option key={c.en} value={isArabic ? c.ar : c.en} />
                    ))}
                  </datalist>
                </label>

                {/* Category */}
                <label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="sr-only">
                    {isArabic ? "نوع العقار" : "Property type"}
                  </span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full cursor-pointer bg-transparent text-sm outline-none"
                  >
                    <option value="">
                      {isArabic ? "كل الأنواع" : "All types"}
                    </option>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {isArabic ? opt.ar : opt.en}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Keyword */}
                <label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="sr-only">
                    {isArabic ? "كلمة البحث" : "Keyword"}
                  </span>
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={isArabic ? "كلمة مفتاحية" : "Keyword"}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </label>

                <Button type="submit" size="lg" className="gap-2">
                  <Search className="h-4 w-4" />
                  {isArabic ? "بحث" : "Search"}
                </Button>
              </div>
            </form>

            {/* Quick city chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {isArabic ? "الأكثر بحثًا:" : "Popular:"}
              </span>
              {SAUDI_CITIES.slice(0, 5).map((c) => (
                <Link
                  key={c.en}
                  href={`${ROUTES.MARKETPLACE}${filtersToQuery({
                    ...EMPTY_FILTERS,
                    city: isArabic ? c.ar : c.en,
                  })}`}
                  className="rounded-full border border-border px-3 py-1 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {isArabic ? c.ar : c.en}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured listings (real data) */}
        <section className="container-tight py-14">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {isArabic ? "عقارات مختارة" : "Featured properties"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isArabic
                  ? "أحدث العقارات المضافة على المنصة"
                  : "The latest properties added to the platform"}
              </p>
            </div>
            <Button asChild variant="outline" className="hidden gap-2 sm:inline-flex">
              <Link href={ROUTES.MARKETPLACE}>
                {isArabic ? "عرض الكل" : "View all"}
                <Arrow className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl border border-border bg-muted"
                />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featured.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {isArabic
                  ? "لا توجد عقارات منشورة بعد. كن أول من يضيف عقارًا."
                  : "No published properties yet. Be the first to list one."}
              </p>
              <Button asChild className="mt-4">
                <Link href={ROUTES.LOGIN}>
                  {isArabic ? "أضف عقارك" : "List a property"}
                </Link>
              </Button>
            </div>
          )}
        </section>

        {/* Saudi cluster map */}
        <section className="border-t border-border bg-secondary/30">
          <div className="container-tight py-14">
            <div className="mb-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {isArabic
                  ? "استكشف العقارات على خريطة المملكة"
                  : "Explore properties on the map of Saudi Arabia"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isArabic
                  ? "كل عقار تنشره الشركات يظهر تلقائيًا على الخريطة. اضغط على أي مجموعة للتكبير."
                  : "Every property an agency publishes appears here automatically. Click a cluster to zoom in."}
              </p>
            </div>
            <div className="h-[420px] overflow-hidden rounded-2xl border border-border shadow-sm">
              <SaudiClusterMap listings={allListings} />
            </div>
            <div className="mt-4">
              <Button asChild variant="outline" className="gap-2">
                <Link href={ROUTES.MARKETPLACE}>
                  {isArabic ? "تصفح كل العقارات" : "Browse all properties"}
                  <Arrow className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="border-y border-border bg-secondary/40">
          <div className="container-tight grid gap-6 py-14 md:grid-cols-3">
            {valueProps.map((item) => (
              <div
                key={item.title.en}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{tr(item.title, locale)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tr(item.body, locale)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="container-tight py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              {isArabic ? "كيف يعمل دار؟" : "How Dar works"}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {isArabic
                ? "ثلاث خطوات بسيطة من البحث حتى التواصل"
                : "Three simple steps from search to contact"}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title.en} className="relative rounded-2xl border border-border bg-card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold">{tr(step.title, locale)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tr(step.body, locale)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA for agencies */}
        <section id="companies" className="container-tight pb-20">
          <div className="overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-12 md:py-16">
            <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight md:text-4xl">
              {isArabic
                ? "هل تملك شركة عقارية؟ اعرض عقاراتك على دار"
                : "Run an agency? List your properties on Dar"}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/80 md:text-base">
              {isArabic
                ? "أنشئ صفحتك، أضف عقاراتك، وأدر عملاءك من لوحة تحكم واحدة."
                : "Create your page, add listings, and manage leads from one dashboard."}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href={ROUTES.SIGNUP}>
                  {isArabic ? "ابدأ مجانًا" : "Start free"}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href={ROUTES.MARKETPLACE}>
                  {isArabic ? "تصفح العقارات" : "Browse properties"}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="container-tight flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </span>
            <span className="font-bold text-foreground">{tr(brand, locale)}</span>
          </div>
          <p>
            © {new Date().getFullYear()} {tr(brand, locale)}.{" "}
            {isArabic ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </p>
          <div className="flex items-center gap-4">
            <Link href={ROUTES.MARKETPLACE} className="hover:text-foreground">
              {isArabic ? "العقارات" : "Properties"}
            </Link>
            <Link href={ROUTES.LOGIN} className="hover:text-foreground">
              {isArabic ? "تسجيل الدخول" : "Sign in"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
