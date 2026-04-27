export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Platform Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Super admin control center for the entire platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total companies", value: "—" },
          { label: "Active listings", value: "—" },
          { label: "Monthly revenue", value: "—" },
          { label: "Platform users", value: "—" },
        ].map((s) => (
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
    </div>
  );
}
