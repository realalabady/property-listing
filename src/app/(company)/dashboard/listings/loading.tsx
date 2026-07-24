export default function ListingsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-md bg-secondary/60" />
        <div className="h-9 w-32 animate-pulse rounded-md bg-secondary/60" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-md bg-secondary/40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="h-44 w-full animate-pulse bg-secondary/50" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-secondary/50" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-secondary/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
