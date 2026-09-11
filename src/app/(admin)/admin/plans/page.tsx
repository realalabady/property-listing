import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { getPlanCatalog } from "@/lib/plans/catalog";
import { ROUTES } from "@/constants/routes";
import { AdminPlansClient } from "@/features/admin/AdminPlansClient";

export const metadata = {
  title: "الباقات",
};

// Prices and offer status must reflect the latest save.
export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireSuperAdmin();
  const catalog = await getPlanCatalog();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">الباقات</h2>
          <p className="text-sm text-muted-foreground">
            عدّل سعر كل باقة وأضف عروضًا تظهر أسفل السعر في صفحة الباقات. حدود
            العقارات والموظفين والمزايا ثابتة.
          </p>
        </div>
        <Link
          href={ROUTES.PRICING}
          target="_blank"
          className="rounded-md border border-border px-3 py-2 text-sm font-semibold transition hover:bg-secondary"
        >
          فتح صفحة الباقات
        </Link>
      </header>

      <AdminPlansClient catalog={catalog} nowMs={Date.now()} />
    </div>
  );
}
