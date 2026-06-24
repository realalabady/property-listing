export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-44 animate-pulse rounded-md bg-secondary/60" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-border bg-card/80"
          />
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-secondary/60" />
        <div className="h-4 w-full animate-pulse rounded bg-secondary/40" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-secondary/40" />
      </div>
    </div>
  );
}
