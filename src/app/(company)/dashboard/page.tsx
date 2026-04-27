import { requireCompanyMember } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const user = await requireCompanyMember();

  const stats = [
    { label: "Active listings", value: "—" },
    { label: "New leads (30d)", value: "—" },
    { label: "Pending tasks", value: "—" },
    { label: "Team members", value: "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.email} ({user.role})
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="text-xs font-medium text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-2 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold">Phase 1 foundation active</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Authentication, session cookies, RBAC claims, and route guards are
          wired. Listings CRUD, leads pipeline, employee management, and KPI
          dashboards are delivered in Phase 2 & 3.
        </p>
      </div>
    </div>
  );
}
