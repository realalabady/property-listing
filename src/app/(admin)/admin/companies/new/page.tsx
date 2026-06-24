import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { ROUTES } from "@/constants/routes";
import { AdminCreateCompanyForm } from "@/features/admin/AdminCreateCompanyForm";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "إنشاء شركة",
};

export default async function AdminCreateCompanyPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("admin.createCompanyTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("admin.createCompanySubtitle")}
          </p>
        </div>

        <Link
          href={ROUTES.ADMIN_COMPANIES}
          className="rounded-md border border-border px-3 py-2 text-sm font-semibold transition hover:bg-secondary"
        >
          {t("admin.backToCompanies")}
        </Link>
      </header>

      <AdminCreateCompanyForm />
    </div>
  );
}
