import { requireCompanyMember } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/constants/listing-categories";
import { OverviewCharts } from "@/features/dashboard/OverviewCharts";
import { t } from "@/lib/i18n";

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
  const stats = await fetchStats(companyId);

  const cards = [
    { label: t("dashPages.activeListings"), value: stats.listings },
    { label: t("dashPages.newLeads30d"), value: stats.leads },
    { label: t("dashPages.pendingTasks"), value: stats.tasks },
    { label: t("dashPages.teamMembers"), value: stats.employees },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("dashPages.welcomeBack")}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="text-xs font-medium text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <OverviewCharts
        funnel={stats.funnel}
        sources={stats.sources}
        trend={stats.trend}
      />
    </div>
  );
}
