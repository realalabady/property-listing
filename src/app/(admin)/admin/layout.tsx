import type { ReactNode } from "react";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { ROUTES } from "@/constants/routes";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { t } from "@/lib/i18n";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSuperAdmin();

  return (
    <div className="enterprise min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 right-0 hidden w-64 border-l border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href={ROUTES.ADMIN} className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary" />
            <span className="font-semibold text-foreground">
              {t("admin.platformAdmin")}
            </span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-4 text-sm">
          <Link
            href={ROUTES.ADMIN}
            className="rounded-md px-3 py-2 hover:bg-secondary"
          >
            {t("admin.overview")}
          </Link>
          <Link
            href={ROUTES.ADMIN_COMPANIES}
            className="rounded-md px-3 py-2 hover:bg-secondary"
          >
            {t("admin.companies")}
          </Link>
          <Link
            href={ROUTES.ADMIN_COMPANY_NEW}
            className="rounded-md px-3 py-2 hover:bg-secondary"
          >
            {t("admin.createCompany")}
          </Link>
          <Link
            href={ROUTES.ADMIN_BILLING}
            className="rounded-md px-3 py-2 hover:bg-secondary"
          >
            {t("admin.billing")}
          </Link>
          <Link
            href={ROUTES.ADMIN_ANALYTICS}
            className="rounded-md px-3 py-2 hover:bg-secondary"
          >
            {t("admin.analytics")}
          </Link>
        </nav>
      </aside>

      <div className="lg:pr-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <h1 className="text-sm font-medium text-muted-foreground">
            {t("admin.superAdmin")}
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
            <span className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
              {t("admin.superAdminBadge")}
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
