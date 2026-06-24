import { requireCompanyMember } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { t } from "@/lib/i18n";

export const metadata = { title: t("dashPages.overviewMeta") };

async function fetchStats(companyId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const base = `companies/${companyId}`;

  const [listingsSnap, leadsSnap, tasksSnap, employeesSnap] = await Promise.all(
    [
      adminDb()
        .collection(`${base}/listings`)
        .where("status", "in", ["published", "draft", "pending_review"])
        .count()
        .get(),
      adminDb()
        .collection(`${base}/leads`)
        .where("createdAt", ">=", thirtyDaysAgo)
        .count()
        .get(),
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
    ],
  );

  return {
    listings: listingsSnap.data().count,
    leads: leadsSnap.data().count,
    tasks: tasksSnap.data().count,
    employees: employeesSnap.data().count,
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
    </div>
  );
}
