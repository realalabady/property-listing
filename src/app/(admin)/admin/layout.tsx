import type { ReactNode } from "react";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { ROUTES } from "@/constants/routes";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href={ROUTES.ADMIN} className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-destructive" />
            <span className="font-semibold">Platform Admin</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-4 text-sm">
          <Link
            href={ROUTES.ADMIN}
            className="rounded-md px-3 py-2 hover:bg-secondary"
          >
            Overview
          </Link>
          <Link
            href={ROUTES.ADMIN_COMPANIES}
            className="rounded-md px-3 py-2 hover:bg-secondary"
          >
            Companies
          </Link>
          <Link
            href={ROUTES.ADMIN_BILLING}
            className="rounded-md px-3 py-2 hover:bg-secondary"
          >
            Billing
          </Link>
          <Link
            href={ROUTES.ADMIN_ANALYTICS}
            className="rounded-md px-3 py-2 hover:bg-secondary"
          >
            Analytics
          </Link>
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <h1 className="text-sm font-medium text-muted-foreground">
            Super Admin
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
            <span className="rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground">
              SUPER ADMIN
            </span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
