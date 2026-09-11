"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  Crown,
  EyeOff,
  Landmark,
  ListChecks,
  Minus,
  Rocket,
  ShieldCheck,
  Sprout,
  Star,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  VAT_RATE,
  isUnlimited,
  planHasFeature,
} from "@/constants/plans";
import { cn } from "@/lib/utils/cn";
import type { PlanIconKey, PublicPlan } from "@/types/plan";
import {
  RaeiSiteFooter,
  RaeiSiteHeader,
  tr,
  type Locale,
  type Localized,
} from "./RaeiSiteChrome";

const formatNumber = (value: number) => value.toLocaleString("en-US");

const PLAN_ICONS: Record<PlanIconKey, LucideIcon> = {
  sprout: Sprout,
  building: Building2,
  landmark: Landmark,
  rocket: Rocket,
  star: Star,
  crown: Crown,
};

/** What the customer pays per year: the offer price when a discount is on. */
function effectivePrice(plan: PublicPlan): number {
  return plan.offer?.type === "discount" && plan.offer.priceSar !== null
    ? plan.offer.priceSar
    : plan.priceSar;
}

function discountPercent(plan: PublicPlan): number {
  return Math.round((1 - effectivePrice(plan) / plan.priceSar) * 100);
}

function formatOfferEnd(ms: number, locale: Locale): string {
  return new Date(ms).toLocaleDateString(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB",
    { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" },
  );
}
const currency: Localized = { ar: "ر.س", en: "SAR" };
const vatPercent = Math.round(VAT_RATE * 100);

/** Admin text with an English fallback to Arabic when left empty. */
function text(value: Localized, locale: Locale): string {
  return locale === "en" ? value.en || value.ar : value.ar || value.en;
}

function listingsLabel(plan: PublicPlan): Localized {
  return isUnlimited(plan.maxListings)
    ? { ar: "عقارات بلا حدود", en: "Unlimited listings" }
    : {
        ar: `حتى ${formatNumber(plan.maxListings)} عقار`,
        en: `Up to ${formatNumber(plan.maxListings)} listings`,
      };
}

function employeesLabel(plan: PublicPlan): Localized {
  return isUnlimited(plan.maxEmployees)
    ? { ar: "موظفون بلا حدود", en: "Unlimited employees" }
    : {
        ar: `حتى ${formatNumber(plan.maxEmployees)} موظف`,
        en: `Up to ${formatNumber(plan.maxEmployees)} employees`,
      };
}

type Cell = boolean | Localized;

interface CompareGroup {
  title: Localized;
  icon: LucideIcon;
  rows: Array<{ label: Localized; value: (plan: PublicPlan) => Cell }>;
}

const always = () => true;

const COMPARE_GROUPS: CompareGroup[] = [
  {
    title: { ar: "العقارات", en: "Listings" },
    icon: Building2,
    rows: [
      { label: { ar: "عدد العقارات", en: "Listings" }, value: listingsLabel },
      {
        label: { ar: "صفحة شركة عامة", en: "Public company page" },
        value: always,
      },
      {
        label: { ar: "إدارة المزادات", en: "Auctions" },
        value: (plan) => planHasFeature(plan, "auctions"),
      },
      {
        label: { ar: "بيانات المالك والصك", en: "Owner and deed details" },
        value: always,
      },
    ],
  },
  {
    title: { ar: "العملاء والمبيعات", en: "Leads and sales" },
    icon: Users,
    rows: [
      {
        label: { ar: "إدارة العملاء المحتملين", en: "Lead management" },
        value: always,
      },
      {
        label: { ar: "طلبات العقارات الواردة", en: "Incoming property requests" },
        value: always,
      },
      {
        label: { ar: "التوزيع التلقائي للعملاء", en: "Automatic lead assignment" },
        value: always,
      },
      {
        label: { ar: "مسار المبيعات", en: "Sales pipeline" },
        value: (plan) => planHasFeature(plan, "pipeline"),
      },
      {
        label: { ar: "العملاء المطابقون", en: "Matched leads" },
        value: (plan) => planHasFeature(plan, "matched_leads"),
      },
    ],
  },
  {
    title: { ar: "الفريق والصلاحيات", en: "Team and access" },
    icon: ShieldCheck,
    rows: [
      { label: { ar: "عدد الموظفين", en: "Employees" }, value: employeesLabel },
      {
        label: { ar: "مجموعات الصلاحيات", en: "Permission groups" },
        value: always,
      },
    ],
  },
  {
    title: { ar: "العمليات والتقارير", en: "Operations and reporting" },
    icon: ListChecks,
    rows: [
      { label: { ar: "المهام", en: "Tasks" }, value: always },
      {
        label: { ar: "مؤشرات الأداء", en: "KPI dashboard" },
        value: (plan) => planHasFeature(plan, "kpi"),
      },
      {
        label: { ar: "شعار وألوان الشركة", en: "Company logo and colors" },
        value: always,
      },
    ],
  },
  {
    title: { ar: "الاشتراك", en: "Billing" },
    icon: CreditCard,
    rows: [
      {
        label: { ar: "السعر السنوي", en: "Yearly price" },
        value: (plan) => {
          const amount = formatNumber(effectivePrice(plan));
          return { ar: `${amount} ر.س`, en: `SAR ${amount}` };
        },
      },
      {
        label: { ar: "دورة الفوترة", en: "Billing cycle" },
        value: () => ({ ar: "سنوية", en: "Yearly" }),
      },
    ],
  },
];

const FAQS: Array<{ q: Localized; a: Localized }> = [
  {
    q: {
      ar: "هل الأسعار شاملة ضريبة القيمة المضافة؟",
      en: "Do prices include VAT?",
    },
    a: {
      ar: `لا. جميع الأسعار المعروضة لا تشمل ضريبة القيمة المضافة (${vatPercent}%)، وتُضاف في الفاتورة.`,
      en: `No. All prices shown exclude ${vatPercent}% VAT, which is added on the invoice.`,
    },
  },
  {
    q: { ar: "ما هي رسوم التأسيس؟", en: "What is the setup fee?" },
    a: {
      ar: "رسوم تُدفع مرة واحدة عند إنشاء حساب شركتك، ولا تتكرر عند تجديد الاشتراك. تنطبق على جميع الباقات، ويؤكد فريقنا قيمتها عند التواصل معك.",
      en: "A one-time fee paid when your company account is created. It doesn't recur on renewal, applies to every plan, and our team confirms the amount when we contact you.",
    },
  },
  {
    q: { ar: "كيف أشترك في باقة؟", en: "How do I subscribe?" },
    a: {
      ar: "أرسل طلب انضمام شركتك من صفحة «انضم كشريك»، وسيتواصل معك فريقنا لتأكيد الباقة وتفعيل حسابك.",
      en: "Send your company's application from the Become a partner page. Our team will contact you to confirm the plan and activate your account.",
    },
  },
  {
    q: {
      ar: "ماذا يحدث عند الوصول إلى حد العقارات أو الموظفين؟",
      en: "What happens when I reach my listing or employee limit?",
    },
    a: {
      ar: "تبقى بياناتك كما هي، لكن لن تتمكن من إضافة عقارات أو موظفين جدد حتى ترقّي باقتك.",
      en: "Your existing data stays as it is, but you can't add new listings or employees until you upgrade.",
    },
  },
  {
    q: { ar: "هل يمكنني الترقية لاحقًا؟", en: "Can I upgrade later?" },
    a: {
      ar: "نعم، تواصل معنا في أي وقت وتُفعَّل حدود ومزايا الباقة الجديدة فورًا.",
      en: "Yes. Contact us any time and the new plan's limits and features apply immediately.",
    },
  },
  {
    q: { ar: "هل الاشتراك شهري أم سنوي؟", en: "Is billing monthly or yearly?" },
    a: {
      ar: "جميع الباقات باشتراك سنوي.",
      en: "All plans are billed yearly.",
    },
  },
];

export function PricingPage({
  plans,
  preview,
}: {
  /** Live plans, lowest first, with only currently-active offers. */
  plans: PublicPlan[];
  /** Super-admin preview of a page that is hidden from visitors. */
  preview: boolean;
}) {
  const [locale, setLocale] = useState<Locale>("ar");
  const isArabic = locale === "ar";

  return (
    <div
      lang={locale}
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        fontFamily: isArabic ? "var(--font-arabic)" : "var(--font-sans)",
      }}
      className="raei-light min-h-screen bg-background text-foreground"
    >
      {preview && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-center text-sm font-medium text-amber-700">
          <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
          {isArabic
            ? "هذه الصفحة مخفية عن الزوار — تظهر لك لأنك مدير المنصة."
            : "This page is hidden from visitors — you see it because you're a platform admin."}
        </div>
      )}
      <RaeiSiteHeader
        locale={locale}
        onToggleLocale={() =>
          setLocale((prev) => (prev === "ar" ? "en" : "ar"))
        }
        showPricing
      />

      <main>
        {/* Hero */}
        <section className="container-tight pb-12 pt-16 text-center md:pt-24">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            {isArabic ? "الباقات" : "Plans"}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            {isArabic
              ? "اختر الباقة المناسبة لحجم مكتبك. كل الباقات تشمل أدوات إدارة العقارات والعملاء والفريق."
              : "Pick the plan that fits your agency. Every plan includes listing, lead, and team tools."}
          </p>
        </section>

        {/* Plan cards */}
        <section className="container-tight">
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} locale={locale} />
            ))}
          </div>
        </section>

        {/* Compare table */}
        {plans.length > 0 && (
          <section className="container-tight py-20">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight md:text-3xl">
              {isArabic
                ? "قارن المزايا بين الباقات"
                : "Compare features across plans"}
            </h2>
            <CompareTable locale={locale} plans={plans} />
          </section>
        )}

        {/* FAQ */}
        <section className="container-tight pb-20">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight md:text-3xl">
            {isArabic ? "الأسئلة الشائعة" : "FAQ"}
          </h2>
          <div className="mx-auto max-w-3xl divide-y divide-border border-y border-border">
            {FAQS.map((item) => (
              <FaqItem key={item.q.en} item={item} locale={locale} />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="container-tight pb-20">
          <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-12">
            <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight md:text-3xl">
              {isArabic
                ? "جاهز تنقل مكتبك إلى راعي؟"
                : "Ready to bring your agency to Raei?"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
              {isArabic
                ? "أرسل طلب الانضمام وسيتواصل معك فريقنا لتفعيل الباقة المناسبة."
                : "Send your application and our team will activate the right plan for you."}
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link href={ROUTES.PARTNER}>
                {isArabic ? "انضم كشريك" : "Become a partner"}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <RaeiSiteFooter locale={locale} showPricing />
    </div>
  );
}

function PlanCard({ plan, locale }: { plan: PublicPlan; locale: Locale }) {
  const isArabic = locale === "ar";
  const Icon = PLAN_ICONS[plan.icon] ?? Sprout;
  const badge = text(plan.badge, locale);
  const featured = badge.length > 0;
  const offer = plan.offer;
  const discounted = offer?.type === "discount" && offer.priceSar !== null;
  const offerLabel = offer
    ? isArabic
      ? offer.labelAr
      : offer.labelEn || offer.labelAr
    : "";
  const intro = text(plan.highlightsIntro, locale);
  // Limits always lead the bullet list so they can't drift from enforcement.
  const bullets: Localized[] = [
    listingsLabel(plan),
    employeesLabel(plan),
    ...plan.highlights,
  ];

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-7",
        featured
          ? "border-primary shadow-lg ring-1 ring-primary"
          : "border-border",
      )}
    >
      {featured && (
        <span className="absolute -top-3 start-7 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      )}

      <Icon className="h-9 w-9 text-primary" strokeWidth={1.5} aria-hidden />
      <h3 className="mt-5 text-2xl font-bold">{text(plan.name, locale)}</h3>
      {text(plan.tagline, locale) && (
        <p className="mt-1 text-sm text-muted-foreground">
          {text(plan.tagline, locale)}
        </p>
      )}

      {discounted ? (
        <div className="mt-6 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground line-through">
            {formatNumber(plan.priceSar)} {tr(currency, locale)}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            -{discountPercent(plan)}%
          </span>
        </div>
      ) : null}
      <div
        className={cn("flex items-baseline gap-1.5", discounted ? "mt-1" : "mt-6")}
      >
        <span className="text-4xl font-extrabold tracking-tight">
          {formatNumber(effectivePrice(plan))}
        </span>
        <span className="text-base font-semibold">{tr(currency, locale)}</span>
        <span className="text-sm text-muted-foreground">
          {isArabic ? "/ سنويًا" : "/ year"}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {isArabic
          ? "السعر لا يشمل الضريبة ورسوم التأسيس"
          : "Excludes VAT and the setup fee"}
      </p>
      {offer && (
        <div className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          <span className="flex items-center gap-1.5">
            <Tag className="h-4 w-4 shrink-0" aria-hidden />
            {offerLabel}
          </span>
          {offer.endsAtMs !== null && (
            <span className="mt-0.5 block text-xs font-normal text-primary/80">
              {isArabic ? "ينتهي العرض في " : "Offer ends "}
              {formatOfferEnd(offer.endsAtMs, locale)}
            </span>
          )}
        </div>
      )}

      <Button
        asChild
        size="lg"
        variant={featured ? "default" : "outline"}
        className="mt-6 w-full"
      >
        <Link href={ROUTES.PARTNER}>
          {isArabic ? "ابدأ الآن" : "Get started"}
        </Link>
      </Button>

      <div className="my-6 border-t border-border" />

      {intro && <p className="mb-3 text-sm font-semibold">{intro}</p>}
      <ul className="space-y-2.5 text-sm">
        {bullets.map((item, index) => (
          <li key={`${index}-${item.ar}`} className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
            <span>{text(item, locale)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function CompareTable({
  locale,
  plans,
}: {
  locale: Locale;
  plans: PublicPlan[];
}) {
  const isArabic = locale === "ar";
  // Every card uses the same fixed column widths so the plan columns line up
  // from the header card down through each section.
  const columns = (
    <colgroup>
      <col className="w-2/5" />
      {plans.map((plan) => (
        <col key={plan.id} />
      ))}
    </colgroup>
  );
  const planHeaderCells = plans.map((plan) => (
    <th key={plan.id} scope="col" className="p-5 text-center align-top">
      <span className="block text-base font-bold">{text(plan.name, locale)}</span>
      <Link
        href={ROUTES.PARTNER}
        className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
      >
        {isArabic ? "ابدأ الآن" : "Get started"}
      </Link>
    </th>
  ));

  return (
    // Padding gives the cards' shadows and hover lift room inside the
    // horizontal scroller on small screens.
    <div className="-mx-2 overflow-x-auto px-2 pb-3 pt-1">
      <div
        className="space-y-4"
        style={{ minWidth: `${260 + plans.length * 150}px` }}
      >
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full table-fixed text-sm">
            {columns}
            <thead>
              <tr>
                <th scope="col" className="p-5 text-start">
                  <span className="sr-only">
                    {isArabic ? "الميزة" : "Feature"}
                  </span>
                </th>
                {planHeaderCells}
              </tr>
            </thead>
          </table>
        </div>

        {COMPARE_GROUPS.map((group) => (
          <CompareGroupCard key={group.title.en} group={group} locale={locale}>
            <table className="w-full table-fixed border-t border-border text-sm">
              {columns}
              <thead className="sr-only">
                <tr>
                  <th scope="col">{isArabic ? "الميزة" : "Feature"}</th>
                  {plans.map((plan) => (
                    <th key={plan.id} scope="col">
                      {text(plan.name, locale)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr
                    key={row.label.en}
                    className="border-t border-border transition-colors first:border-t-0 hover:bg-muted/50"
                  >
                    <th
                      scope="row"
                      className="px-5 py-3.5 text-start font-medium"
                    >
                      {tr(row.label, locale)}
                    </th>
                    {plans.map((plan) => (
                      <td key={plan.id} className="px-5 py-3.5 text-center">
                        <CompareCell value={row.value(plan)} locale={locale} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CompareGroupCard>
        ))}
      </div>
    </div>
  );
}

/**
 * Smooth expand/collapse panel. Native <details> snaps open, so this animates
 * grid rows 0fr → 1fr (works for any content height) and fades the content in.
 * Closed panels are inert so their contents stay out of the tab order.
 */
function Collapsible({
  open,
  id,
  children,
}: {
  open: boolean;
  id: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "transition duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none",
            open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function FaqItem({
  item,
  locale,
}: {
  item: { q: Localized; a: Localized };
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="py-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "group flex w-full cursor-pointer items-center justify-between gap-4 py-3 text-start text-base font-semibold transition-colors duration-200 hover:text-primary",
          open && "text-primary",
        )}
      >
        {tr(item.q, locale)}
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition duration-300 ease-out group-hover:text-primary motion-reduce:transition-none",
            open && "rotate-180 text-primary",
          )}
          aria-hidden
        />
      </button>
      <Collapsible open={open} id={panelId}>
        <p className="pb-3 text-sm leading-relaxed text-muted-foreground">
          {tr(item.a, locale)}
        </p>
      </Collapsible>
    </div>
  );
}

/** One comparison section; every section starts collapsed. */
function CompareGroupCard({
  group,
  locale,
  children,
}: {
  group: CompareGroup;
  locale: Locale;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const GroupIcon = group.icon;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-start"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GroupIcon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="text-base font-semibold">
            {tr(group.title, locale)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <Collapsible open={open} id={panelId}>
        {children}
      </Collapsible>
    </div>
  );
}

function CompareCell({ value, locale }: { value: Cell; locale: Locale }) {
  const isArabic = locale === "ar";
  if (value === true) {
    return (
      <>
        <Check className="mx-auto h-4 w-4 text-primary" aria-hidden />
        <span className="sr-only">{isArabic ? "متاح" : "Included"}</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus
          className="mx-auto h-4 w-4 text-muted-foreground/50"
          aria-hidden
        />
        <span className="sr-only">{isArabic ? "غير متاح" : "Not included"}</span>
      </>
    );
  }
  return <span className="text-foreground">{tr(value, locale)}</span>;
}
