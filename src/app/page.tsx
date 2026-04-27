import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      {/* Top bar */}
      <header className="border-b border-border/60">
        <div className="container-tight flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-lg font-semibold tracking-tight">
              RealEstateSaaS
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href={ROUTES.MARKETPLACE}
              className="text-muted-foreground hover:text-foreground"
            >
              Marketplace
            </Link>
            <Link
              href={ROUTES.LOGIN}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href={ROUTES.SIGNUP}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container-tight py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Multi-tenant SaaS for real estate companies
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Run your entire real estate business
            <span className="block text-muted-foreground">
              from one premium platform.
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Branded landing pages, CRM, listings, leads, KPI dashboards, and
            automation — built for companies that want to scale.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={ROUTES.SIGNUP}
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Start your company
            </Link>
            <Link
              href={ROUTES.MARKETPLACE}
              className="rounded-md border border-border bg-background px-6 py-3 text-sm font-semibold transition hover:bg-secondary"
            >
              Browse marketplace
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: "Branded websites",
              body: "Every company gets its own fully branded, bilingual landing page.",
            },
            {
              title: "Internal CRM",
              body: "Listings, leads, tasks, employees, and KPI tracking — all in one place.",
            },
            {
              title: "Automation",
              body: "Lead auto-assignment, task escalation, and KPI aggregation out of the box.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 transition hover:shadow-sm"
            >
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="container-tight flex h-14 items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} RealEstateSaaS</span>
          <span>Phase 1 • Foundation</span>
        </div>
      </footer>
    </main>
  );
}
