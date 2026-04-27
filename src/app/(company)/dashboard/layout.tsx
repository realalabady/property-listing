import type { ReactNode } from "react";
import Link from "next/link";
import { requireCompanyMember } from "@/lib/auth/guards";
import { ROUTES } from "@/constants/routes";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireCompanyMember();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary" />
            <span className="font-semibold">Dashboard</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-4 text-sm">
          <SidebarLink href={ROUTES.DASHBOARD} label="Overview" />
          <SidebarLink href={ROUTES.DASHBOARD_LISTINGS} label="Listings" />
          <SidebarLink href={ROUTES.DASHBOARD_LEADS} label="Leads" />
          <SidebarLink href={ROUTES.DASHBOARD_EMPLOYEES} label="Employees" />
          <SidebarLink href={ROUTES.DASHBOARD_TASKS} label="Tasks" />
          <SidebarLink href={ROUTES.DASHBOARD_KPI} label="KPI" />
          <SidebarLink href={ROUTES.DASHBOARD_SETTINGS} label="Settings" />
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <h1 className="text-sm font-medium text-muted-foreground">
            Company ID:{" "}
            <span className="text-foreground">{user.companyId}</span>
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              {user.role}
            </span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
    >
      {label}
    </Link>
  );
}
