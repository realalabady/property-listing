import { requireSuperAdmin } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { t } from "@/lib/i18n";

export const metadata = { title: t("admin.overviewMeta") };

function isMissingPublishedListingsIndex(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("FAILED_PRECONDITION") &&
    message.includes("collection listings") &&
    message.includes("field status")
  );
}

async function fetchListingsMetric() {
  try {
    const published = await adminDb()
      .collectionGroup("listings")
      .where("status", "==", "published")
      .count()
      .get();

    return {
      count: published.data().count,
      isFallback: false,
    };
  } catch (error) {
    if (!isMissingPublishedListingsIndex(error)) {
      throw error;
    }

    // Graceful fallback while the required collection-group index is building.
    const total = await adminDb().collectionGroup("listings").count().get();
    return {
      count: total.data().count,
      isFallback: true,
    };
  }
}

async function fetchPlatformStats() {
  const [companiesSnap, listingsMetric, usersSnap] = await Promise.all([
    adminDb().collection("companies").count().get(),
    fetchListingsMetric(),
    adminDb().collection("users").count().get(),
  ]);

  return {
    companies: companiesSnap.data().count,
    listings: listingsMetric.count,
    listingsFallback: listingsMetric.isFallback,
    users: usersSnap.data().count,
  };
}

export default async function AdminOverviewPage() {
  await requireSuperAdmin();
  const stats = await fetchPlatformStats();

  const cards = [
    { label: t("admin.totalCompanies"), value: stats.companies },
    {
      label: stats.listingsFallback
        ? t("admin.totalListings")
        : t("admin.publishedListings"),
      value: stats.listings,
    },
    { label: t("admin.platformUsers"), value: stats.users },
    { label: t("admin.monthlyRevenue"), value: "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("admin.overviewTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.overviewSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="text-xs font-medium text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-2 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      {stats.listingsFallback && (
        <p className="text-xs text-muted-foreground">
          {t("admin.listingsIndexBuilding")}
        </p>
      )}
    </div>
  );
}
