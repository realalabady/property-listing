export default function PipelineLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded-md bg-secondary/60" />
      <div className="flex gap-4 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="w-72 shrink-0 space-y-3">
            <div className="h-6 w-32 animate-pulse rounded bg-secondary/60" />
            {Array.from({ length: 3 }).map((_, card) => (
              <div
                key={card}
                className="h-24 animate-pulse rounded-xl border border-border bg-card/80"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
