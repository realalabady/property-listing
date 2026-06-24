import { requireCompanyMember } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { formatDate } from "@/lib/utils/format";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("kpi.meta"),
};

interface KpiOverview {
  totalListings: number;
  activeListings: number;
  totalLeads: number;
  convertedLeads: number;
  avgResponseMinutes: number;
  tasksCompleted: number;
  tasksOverdue: number;
  totalEmployees: number;
  period: string;
  updatedAt: Date | null;
}

interface SnapshotRow {
  id: string;
  employeeName: string;
  listingsActive: number;
  leadsConverted: number;
  avgResponseMinutes: number;
  tasksCompleted: number;
  period: string;
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
  return null;
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function DashboardKPIPage() {
  const user = await requireCompanyMember();
  const companyId = user.companyId as string;

  const [overviewSnap, snapshotsSnap] = await Promise.all([
    adminDb().doc(`companies/${companyId}/kpi/current`).get(),
    adminDb()
      .collection(`companies/${companyId}/kpi_snapshots`)
      .orderBy("period", "desc")
      .limit(12)
      .get(),
  ]);

  const overviewData = overviewSnap.exists
    ? (overviewSnap.data() as Record<string, unknown>)
    : null;

  const overview: KpiOverview | null = overviewData
    ? {
        totalListings: asNumber(overviewData.totalListings),
        activeListings: asNumber(overviewData.activeListings),
        totalLeads: asNumber(overviewData.totalLeads),
        convertedLeads: asNumber(overviewData.convertedLeads),
        avgResponseMinutes: asNumber(overviewData.avgResponseMinutes),
        tasksCompleted: asNumber(overviewData.tasksCompleted),
        tasksOverdue: asNumber(overviewData.tasksOverdue),
        totalEmployees: asNumber(overviewData.totalEmployees),
        period:
          typeof overviewData.period === "string"
            ? overviewData.period
            : t("kpi.notAvailable"),
        updatedAt: toDate(overviewData.updatedAt),
      }
    : null;

  const rows: SnapshotRow[] = snapshotsSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      employeeName:
        typeof data.employeeName === "string"
          ? data.employeeName
          : t("dashPages.employeeFallback"),
      listingsActive: asNumber(data.listingsActive),
      leadsConverted: asNumber(data.leadsConverted),
      avgResponseMinutes: asNumber(data.avgResponseMinutes),
      tasksCompleted: asNumber(data.tasksCompleted),
      period: typeof data.period === "string" ? data.period : "-",
    };
  });

  // Latest period first (from the query); within a period, rank by converted leads.
  rows.sort(
    (a, b) =>
      b.period.localeCompare(a.period) || b.leadsConverted - a.leadsConverted,
  );

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("kpi.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("kpi.subtitle")}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          label={t("kpi.activeListings")}
          value={overview ? String(overview.activeListings) : "-"}
        />
        <KpiCard
          label={t("kpi.convertedLeads")}
          value={overview ? String(overview.convertedLeads) : "-"}
        />
        <KpiCard
          label={t("kpi.avgResponse")}
          value={
            overview
              ? t("kpi.minutes", { n: overview.avgResponseMinutes })
              : "-"
          }
        />
        <KpiCard
          label={t("kpi.tasksOverdue")}
          value={overview ? String(overview.tasksOverdue) : "-"}
        />
      </section>

      {overview ? (
        <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p>
            {t("kpi.period")}{" "}
            <span className="font-medium text-foreground">
              {overview.period}
            </span>
          </p>
          <p className="mt-1">
            {t("kpi.updated")}{" "}
            {overview.updatedAt ? formatDate(overview.updatedAt) : "-"}
          </p>
          <p className="mt-1">
            {t("kpi.totalsLine", {
              listings: overview.totalListings,
              leads: overview.totalLeads,
              employees: overview.totalEmployees,
            })}
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("kpi.notGenerated")}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("kpi.colEmployee")}</th>
                <th className="px-4 py-3">{t("kpi.colPeriod")}</th>
                <th className="px-4 py-3">{t("kpi.colActiveListings")}</th>
                <th className="px-4 py-3">{t("kpi.colConvertedLeads")}</th>
                <th className="px-4 py-3">{t("kpi.colAvgResponse")}</th>
                <th className="px-4 py-3">{t("kpi.colTasksCompleted")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={6}>
                    {t("kpi.noSnapshots")}
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-4 font-medium">{row.employeeName}</td>
                  <td className="px-4 py-4">{row.period}</td>
                  <td className="px-4 py-4">{row.listingsActive}</td>
                  <td className="px-4 py-4">{row.leadsConverted}</td>
                  <td className="px-4 py-4">
                    {t("kpi.minutes", { n: row.avgResponseMinutes })}
                  </td>
                  <td className="px-4 py-4">{row.tasksCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
