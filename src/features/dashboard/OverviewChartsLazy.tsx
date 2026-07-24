"use client";

import dynamic from "next/dynamic";

// Code-split the overview charts so `recharts` + `framer-motion` (only used
// here) stay out of the dashboard route's initial JS. `ssr: false` needs a
// client boundary, which is why this thin wrapper exists — the server page
// (dashboard/page.tsx) imports this instead of OverviewCharts directly.
export const OverviewChartsLazy = dynamic(
  () => import("./OverviewCharts").then((m) => m.OverviewCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-[320px] w-full animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-[320px] w-full animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-[380px] w-full animate-pulse rounded-xl border border-border bg-muted/40 lg:col-span-2" />
      </div>
    ),
  },
);
