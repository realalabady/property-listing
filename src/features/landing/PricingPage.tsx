"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Landmark,
  Minus,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  PLAN_IDS,
  PLAN_PRICES_SAR,
  SETUP_FEE_SAR,
  VAT_RATE,
  isUnlimited,
  limitsForPlan,
  planHasFeature,
  type PlanFeature,
} from "@/constants/plans";
import { cn } from "@/lib/utils/cn";
import type { SubscriptionPlanId } from "@/types/company";
import {
  RaeiSiteFooter,
  RaeiSiteHeader,
  tr,
  type Locale,
  type Localized,
} from "./RaeiSiteChrome";

const formatNumber = (value: number) => value.toLocaleString("en-US");
const currency: Localized = { ar: "ر.س", en: "SAR" };
const vatPercent = Math.round(VAT_RATE * 100);

interface PlanCopy {
  icon: LucideIcon;
  name: Localized;
  tagline: Localized;
  /** "Everything in X, plus:" — null for the entry plan. */
  includesPrevious: Localized | null;
  highlights: Localized[];
}

function listingsLabel(plan: SubscriptionPlanId): Localized {
  const { maxListings } = limitsForPlan(plan);
  return isUnlimited(maxListings)
    ? { ar: "عقارات بلا حدود", en: "Unlimited listings" }
    : {
        ar: `حتى ${formatNumber(maxListings)} عقار`,
        en: `Up to ${formatNumber(maxListings)} listings`,
      };
}

function employeesLabel(plan: SubscriptionPlanId): Localized {
  const { maxEmployees } = limitsForPlan(plan);
  return isUnlimited(maxEmployees)
    ? { ar: "موظفون بلا حدود", en: "Unlimited employees" }
    : {
        ar: `حتى ${formatNumber(maxEmployees)} موظف`,
        en: `Up to ${formatNumber(maxEmployees)} employees`,
      };
}

const FEATURE_COPY: Record<PlanFeature, Localized> = {
  pipeline: {
    ar: "مسار المبيعات بلوحة مراحل قابلة للسحب والإفلات",
    en: "Sales pipeline with a drag-and-drop stage board",
  },
  matched_leads: {
    ar: "العملاء المطابقون: عملاء يبحثون عن عقارات تطابق عقاراتك",
    en: "Matched leads: buyers searching for listings like yours",
  },
};

const PLAN_COPY: Record<SubscriptionPlanId, PlanCopy> = {
  starter: {
    icon: Sprout,
    name: { ar: "مبتدئ", en: "Starter" },
    tagline: {
      ar: "للمكاتب العقارية في بدايتها",
      en: "For agencies getting started",
    },
    includesPrevious: null,
    highlights: [
      listingsLabel("starter"),
      employeesLabel("starter"),
      { ar: "صفحة شركة عامة بهويتك", en: "Public company page with your brand" },
      { ar: "إدارة العملاء المحتملين", en: "Lead management" },
      { ar: "استقبال طلبات العقارات", en: "Incoming property requests" },
      { ar: "المهام ومؤشرات الأداء", en: "Tasks and KPIs" },
      { ar: "مجموعات الصلاحيات للفريق", en: "Team permission groups" },
      { ar: "إدارة المزادات", en: "Auction management" },
    ],
  },
  pro: {
    icon: Building2,
    name: { ar: "احترافي", en: "Pro" },
    tagline: {
      ar: "للمكاتب المتنامية وفرق المبيعات",
      en: "For growing agencies and sales teams",
    },
    includesPrevious: {
      ar: "كل مزايا مبتدئ، بالإضافة إلى:",
      en: "Everything in Starter, plus:",
    },
    highlights: [listingsLabel("pro"), employeesLabel("pro")],
  },
  enterprise: {
    icon: Landmark,
    name: { ar: "مؤسسات", en: "Enterprise" },
    tagline: {
      ar: "كل المزايا بلا حدود",
      en: "Every feature, no limits",
    },
    includesPrevious: {
      ar: "كل مزايا احترافي، بالإضافة إلى:",
      en: "Everything in Pro, plus:",
    },
    highlights: [
      listingsLabel("enterprise"),
      employeesLabel("enterprise"),
      FEATURE_COPY.pipeline,
      FEATURE_COPY.matched_leads,
    ],
  },
};

type Cell = boolean | Localized;

interface CompareGroup {
  title: Localized;
  rows: Array<{ label: Localized; value: (plan: SubscriptionPlanId) => Cell }>;
}

const always = () => true;

const COMPARE_GROUPS: CompareGroup[] = [
  {
    title: { ar: "العقارات", en: "Listings" },
    rows: [
      { label: { ar: "عدد العقارات", en: "Listings" }, value: listingsLabel },
      {
        label: { ar: "صفحة شركة عامة", en: "Public company page" },
        value: always,
      },
      { label: { ar: "المزادات", en: "Auctions" }, value: always },
      {
        label: { ar: "بيانات المالك والصك", en: "Owner and deed details" },
        value: always,
      },
    ],
  },
  {
    title: { ar: "العملاء والمبيعات", en: "Leads and sales" },
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
    rows: [
      { label: { ar: "المهام", en: "Tasks" }, value: always },
      { label: { ar: "مؤشرات الأداء", en: "KPI dashboard" }, value: always },
      {
        label: { ar: "شعار وألوان الشركة", en: "Company logo and colors" },
        value: always,
      },
    ],
  },
  {
    title: { ar: "الاشتراك", en: "Billing" },
    rows: [
      {
        label: { ar: "السعر السنوي", en: "Yearly price" },
        value: (plan) => ({
          ar: `${formatNumber(PLAN_PRICES_SAR[plan])} ر.س`,
          en: `SAR ${formatNumber(PLAN_PRICES_SAR[plan])}`,
        }),
      },
      {
        label: { ar: "رسوم التأسيس", en: "Setup fee" },
        value: () => ({
          ar: `${formatNumber(SETUP_FEE_SAR)} ر.س لمرة واحدة`,
          en: `SAR ${formatNumber(SETUP_FEE_SAR)} one-time`,
        }),
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
      ar: `رسوم بقيمة ${formatNumber(SETUP_FEE_SAR)} ر.س تُدفع مرة واحدة عند إنشاء حساب شركتك، ولا تتكرر عند تجديد الاشتراك. تنطبق على جميع الباقات ولا تشمل الضريبة.`,
      en: `A one-time SAR ${formatNumber(SETUP_FEE_SAR)} fee paid when your company account is created. It doesn't recur on renewal, applies to every plan, and excludes VAT.`,
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

export function PricingPage() {
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
      <RaeiSiteHeader
        locale={locale}
        onToggleLocale={() =>
          setLocale((prev) => (prev === "ar" ? "en" : "ar"))
        }
      />

      <main>
        {/* Hero */}
        <section className="container-tight pb-12 pt-16 text-center md:pt-24">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            {isArabic ? "الباقات والأسعار" : "Pricing"}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            {isArabic
              ? "اختر الباقة المناسبة لحجم مكتبك. كل الباقات تشمل أدوات إدارة العقارات والعملاء والفريق."
              : "Pick the plan that fits your agency. Every plan includes listing, lead, and team tools."}
          </p>
        </section>

        {/* Plan cards */}
        <section className="container-tight">
          <div className="grid gap-5 lg:grid-cols-3">
            {PLAN_IDS.map((plan) => (
              <PlanCard key={plan} plan={plan} locale={locale} />
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
            {isArabic
              ? `الأسعار سنوية ولا تشمل ضريبة القيمة المضافة (${vatPercent}%). تُضاف رسوم تأسيس لمرة واحدة بقيمة ${formatNumber(SETUP_FEE_SAR)} ر.س عند إنشاء الحساب.`
              : `Prices are yearly and exclude ${vatPercent}% VAT. A one-time SAR ${formatNumber(SETUP_FEE_SAR)} setup fee applies when the account is created.`}
          </p>
        </section>

        {/* Compare table */}
        <section className="container-tight py-20">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight md:text-3xl">
            {isArabic ? "قارن المزايا بين الباقات" : "Compare features across plans"}
          </h2>
          <CompareTable locale={locale} />
        </section>

        {/* FAQ */}
        <section className="container-tight pb-20">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight md:text-3xl">
            {isArabic ? "الأسئلة الشائعة" : "FAQ"}
          </h2>
          <div className="mx-auto max-w-3xl divide-y divide-border border-y border-border">
            {FAQS.map((item) => (
              <details key={item.q.en} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-start text-base font-semibold [&::-webkit-details-marker]:hidden">
                  {tr(item.q, locale)}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {tr(item.a, locale)}
                </p>
              </details>
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

      <RaeiSiteFooter locale={locale} />
    </div>
  );
}

function PlanCard({
  plan,
  locale,
}: {
  plan: SubscriptionPlanId;
  locale: Locale;
}) {
  const isArabic = locale === "ar";
  const copy = PLAN_COPY[plan];
  const Icon = copy.icon;
  const featured = plan === "enterprise";

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
          {isArabic ? "كل المزايا" : "All features"}
        </span>
      )}

      <Icon className="h-9 w-9 text-primary" strokeWidth={1.5} aria-hidden />
      <h3 className="mt-5 text-2xl font-bold">{tr(copy.name, locale)}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {tr(copy.tagline, locale)}
      </p>

      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="text-4xl font-extrabold tracking-tight">
          {formatNumber(PLAN_PRICES_SAR[plan])}
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

      {copy.includesPrevious && (
        <p className="mb-3 text-sm font-semibold">
          {tr(copy.includesPrevious, locale)}
        </p>
      )}
      <ul className="space-y-2.5 text-sm">
        {copy.highlights.map((item) => (
          <li key={item.en} className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
            <span>{tr(item, locale)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function CompareTable({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="w-2/5 p-5 text-start font-semibold">
              <span className="sr-only">
                {isArabic ? "الميزة" : "Feature"}
              </span>
            </th>
            {PLAN_IDS.map((plan) => (
              <th key={plan} scope="col" className="p-5 text-center align-top">
                <span className="block text-base font-bold">
                  {tr(PLAN_COPY[plan].name, locale)}
                </span>
                <Link
                  href={ROUTES.PARTNER}
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                >
                  {isArabic ? "ابدأ الآن" : "Get started"}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        {COMPARE_GROUPS.map((group) => (
          <tbody key={group.title.en}>
            <tr className="bg-muted/50">
              <th
                scope="colgroup"
                colSpan={PLAN_IDS.length + 1}
                className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {tr(group.title, locale)}
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr
                key={row.label.en}
                className="border-t border-border first:border-t-0"
              >
                <th scope="row" className="px-5 py-3.5 text-start font-medium">
                  {tr(row.label, locale)}
                </th>
                {PLAN_IDS.map((plan) => (
                  <td key={plan} className="px-5 py-3.5 text-center">
                    <CompareCell value={row.value(plan)} locale={locale} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
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
