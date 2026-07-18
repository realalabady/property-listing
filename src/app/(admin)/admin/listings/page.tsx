import { requireSuperAdmin } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { AdminListingsClient } from "@/features/admin/AdminListingsClient";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "كل العقارات",
};

export interface AdminListingRow {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  status: string;
  price: number | null;
  currency: string;
  createdAt: string | null;
}

function serializeDate(value: unknown): string | null {
  if (!value) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

async function fetchCompanyNames(): Promise<Map<string, string>> {
  const snap = await adminDb().collection("companies").select("name").get();
  const map = new Map<string, string>();
  for (const doc of snap.docs) {
    const name = doc.get("name");
    map.set(doc.id, typeof name === "string" ? name : doc.id);
  }
  return map;
}

async function fetchAllListings(): Promise<AdminListingRow[]> {
  const [snap, companyNames] = await Promise.all([
    adminDb()
      .collectionGroup("listings")
      .orderBy("createdAt", "desc")
      .limit(300)
      .get(),
    fetchCompanyNames(),
  ]);

  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    // collectionGroup path is companies/{cid}/listings/{lid} → grandparent id.
    const companyId = doc.ref.parent.parent?.id ?? "";
    return {
      id: doc.id,
      companyId,
      companyName: companyNames.get(companyId) ?? companyId,
      title:
        typeof data.title === "string" && data.title.trim()
          ? data.title
          : t("admin.untitledCompany"),
      status: typeof data.status === "string" ? data.status : "draft",
      price: typeof data.price === "number" ? data.price : null,
      currency: typeof data.currency === "string" ? data.currency : "SAR",
      createdAt: serializeDate(data.createdAt),
    };
  });
}

export default async function AdminAllListingsPage() {
  await requireSuperAdmin();
  const listings = await fetchAllListings();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("admin.globalListingsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.globalListingsSubtitle")}
        </p>
      </header>

      <AdminListingsClient listings={listings} />
    </div>
  );
}
