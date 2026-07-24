export default function ListingDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded-md bg-secondary/60" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video w-full animate-pulse rounded-xl bg-secondary/50" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-16 w-24 animate-pulse rounded-lg bg-secondary/40"
              />
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-4 w-full animate-pulse rounded bg-secondary/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
