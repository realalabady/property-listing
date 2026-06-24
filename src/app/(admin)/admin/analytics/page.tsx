import { requireSuperAdmin } from "@/lib/auth/guards";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "التحليلات",
};

export default async function AdminAnalyticsPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("admin.analyticsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.analyticsSubtitleFull")}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold">
            {t("admin.analyticsTrafficTitle")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("admin.analyticsTrafficSessions")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("admin.analyticsTrafficDuration")}
          </p>
        </article>

        <article className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold">
            {t("admin.analyticsConversionTitle")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("admin.analyticsMarketplaceConv")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("admin.analyticsLandingConv")}
          </p>
        </article>
      </section>
    </div>
  );
}
