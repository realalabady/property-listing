import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/utils/format";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "الفوترة",
};

export default async function AdminBillingPage() {
  await requireSuperAdmin();

  const mrr = 124300;
  const arpu = 2486;
  const churnRate = 2.4;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("admin.billingTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.billingRevenueHealth")}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card label={t("admin.billingMrr")} value={formatCurrency(mrr)} />
        <Card label={t("admin.billingArpu")} value={formatCurrency(arpu)} />
        <Card label={t("admin.billingChurn")} value={`${churnRate}%`} />
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
