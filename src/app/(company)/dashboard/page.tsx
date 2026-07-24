import { unstable_cache } from "next/cache";
import { requireCompanyMember } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/constants/listing-categories";
import { OverviewChartsLazy } from "@/features/dashboard/OverviewChartsLazy";
import { t } from "@/lib/i18n";
import { Building2, UserPlus, ListChecks, Users } from "lucide-react";

// Overview stats are counts/aggregates that don't need to be real-time. Cache
// per company for 60s so repeat visits paint instantly and don't re-run the
// ~17 Firestore aggregations on every navigation. The `companyId` argument is
// part of the cache key; `stats:<companyId>` tag allows targeted invalidation.
const getCachedStats = unstable_cache(
  (companyId: string) => fetchStats(companyId),
  ["dashboard-overview-stats"],
  { revalidate: 60 },
);

export const metadata = { title: t("dashPages.overviewMeta") };

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

// Lead progression stages for the funnel (lost is excluded — it's not a stage).
const FUNNEL_STAGES: LeadStatus[] = [
  LEAD_STATUSES.NEW,
  LEAD_STATUSES.CONTACTED,
  LEAD_STATUSES.QUALIFIED,
  LEAD_STATUSES.DEAL,
];

const LEAD_SOURCES = [
  "website_form",
  "whatsapp",
  "phone",
  "walk_in",
  "social_media",
  "referral",
  "marketplace",
  "other",
] as const;

async function fetchStats(companyId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const base = `companies/${companyId}`;
  const leadsRef = adminDb().collection(`${base}/leads`);

  const countWhere = (field: string, value: string) =>
    leadsRef.where(field, "==", value).count().get();

  const [
    listingsSnap,
    leadsSnap,
    tasksSnap,
    employeesSnap,
    funnelSnaps,
    sourceSnaps,
    trendSnap,
  ] = await Promise.all([
    adminDb()
      .collection(`${base}/listings`)
      .where("status", "in", ["published", "draft", "pending_review"])
      .count()
      .get(),
    leadsRef.where("createdAt", ">=", thirtyDaysAgo).count().get(),
    adminDb()
      .collection(`${base}/tasks`)
      .where("status", "in", ["todo", "in_progress"])
      .count()
      .get(),
    adminDb()
      .collection(`${base}/employees`)
      .where("active", "==", true)
      .count()
      .get(),
    Promise.all(FUNNEL_STAGES.map((s) => countWhere("status", s))),
    Promise.all(LEAD_SOURCES.map((s) => countWhere("source", s))),
    adminDb()
      .collection(`${base}/kpi_snapshots`)
      .orderBy("period", "desc")
      .limit(300)
      .get(),
  ]);

  const funnel = FUNNEL_STAGES.map((stage, i) => ({
    stage,
    label: LEAD_STATUS_LABELS[stage].ar,
    value: funnelSnaps[i]!.data().count,
  }));

  const sources = LEAD_SOURCES.map((key, i) => ({
    key,
    value: sourceSnaps[i]!.data().count,
  }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  // Aggregate per-employee monthly snapshots into a company monthly trend.
  const byPeriod = new Map<string, { leads: number; conversions: number }>();
  for (const doc of trendSnap.docs) {
    const period = doc.get("period");
    if (typeof period !== "string") continue;
    const cur = byPeriod.get(period) ?? { leads: 0, conversions: 0 };
    cur.leads += asNumber(doc.get("leadsAssigned"));
    cur.conversions += asNumber(doc.get("leadsConverted"));
    byPeriod.set(period, cur);
  }
  const trend = [...byPeriod.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([period, v]) => {
      const [year, month] = period.split("-");
      return {
        period,
        label: `${month}/${(year ?? "").slice(2)}`,
        leads: v.leads,
        conversions: v.conversions,
      };
    });

  return {
    listings: listingsSnap.data().count,
    leads: leadsSnap.data().count,
    tasks: tasksSnap.data().count,
    employees: employeesSnap.data().count,
    funnel,
    sources,
    trend,
  };
}

export default async function DashboardPage() {
  const user = await requireCompanyMember();
  const companyId = user.companyId as string;
  const stats = await getCachedStats(companyId);

  const cards = [
    {
      label: t("dashPages.activeListings"),
      value: stats.listings,
      icon: Building2,
      tint: TINTS.purple,
    },
    {
      label: t("dashPages.newLeads30d"),
      value: stats.leads,
      icon: UserPlus,
      tint: TINTS.blue,
    },
    {
      label: t("dashPages.pendingTasks"),
      value: stats.tasks,
      icon: ListChecks,
      tint: TINTS.amber,
    },
    {
      label: t("dashPages.teamMembers"),
      value: stats.employees,
      icon: Users,
      tint: TINTS.teal,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("dashPages.welcomeBack")}
        </h2>
        <p className="mt-1 text-sm">{t("dashPages.overviewSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="stat-rise group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg hover:shadow-black/[0.06]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {/* Top accent rail — brand-tinted per metric. */}
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${s.tint.bar}`}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="mt-2.5 text-[2rem] font-bold leading-none tabular-nums text-slate-800">
                    {s.value}
                  </div>
                </div>
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${s.tint.chip}`}
                >
                  <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={2} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <OverviewChartsLazy
        funnel={stats.funnel}
        sources={stats.sources}
        trend={stats.trend}
      />
    </div>
  );
}

// Per-metric tint: soft chip background + full-strength icon, and a gradient
// accent rail. Colors stay within the Wazi brand family (purple/blue/teal)
// with a warm amber for the "pending" attention metric.
const TINTS = {
  purple: {
    chip: "bg-[#662d91]/[0.1] text-[#662d91]",
    bar: "from-[#662d91] to-[#9a5bc9]",
  },
  blue: {
    chip: "bg-[#0071bc]/[0.1] text-[#0071bc]",
    bar: "from-[#0071bc] to-[#4aa3e0]",
  },
  amber: {
    chip: "bg-[#e0891f]/[0.12] text-[#c1771a]",
    bar: "from-[#e0891f] to-[#f2b45e]",
  },
  teal: {
    chip: "bg-[#00a99d]/[0.1] text-[#008d83]",
    bar: "from-[#00a99d] to-[#4fcabf]",
  },
} as const;
