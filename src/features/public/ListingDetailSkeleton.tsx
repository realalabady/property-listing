/**
 * Lightweight loading placeholder for the public listing detail pages.
 * Rendered by each route's `loading.tsx` (React Suspense) while the server
 * fetches the listing, so the user sees the card's shape immediately instead
 * of a blank screen or a bare spinner.
 */
export function ListingDetailSkeleton() {
  return (
    <main className="container-tight py-12" aria-busy="true" aria-live="polite">
      <div className="mb-6 h-4 w-28 animate-pulse rounded bg-secondary" />

      <article className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Cover image */}
        <div className="h-80 w-full animate-pulse bg-secondary md:h-96" />

        <div className="space-y-4 p-6">
          {/* Title + type badge */}
          <div className="flex items-center justify-between gap-3">
            <div className="h-7 w-2/3 animate-pulse rounded bg-secondary" />
            <div className="h-6 w-16 animate-pulse rounded bg-secondary" />
          </div>

          {/* Company line */}
          <div className="h-4 w-40 animate-pulse rounded bg-secondary" />

          {/* Price */}
          <div className="h-8 w-32 animate-pulse rounded bg-secondary" />

          {/* Location */}
          <div className="h-4 w-56 animate-pulse rounded bg-secondary" />

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-3 border-y border-border py-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-secondary" />
                <div className="h-4 w-10 animate-pulse rounded bg-secondary" />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-secondary" />
            <div className="h-10 w-32 animate-pulse rounded-lg bg-secondary" />
          </div>
        </div>
      </article>
    </main>
  );
}
