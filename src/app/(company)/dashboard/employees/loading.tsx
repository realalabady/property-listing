export default function EmployeesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 animate-pulse rounded-md bg-secondary/60" />
        <div className="h-9 w-32 animate-pulse rounded-md bg-secondary/60" />
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-secondary/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-secondary/50" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-secondary/40" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-secondary/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
