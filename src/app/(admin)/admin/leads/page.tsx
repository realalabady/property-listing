import { requireSuperAdmin } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { AdminLeadsClient } from "@/features/admin/AdminLeadsClient";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "كل العملاء",
};

export interface AdminLeadRow {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  assignedToName: string;
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

async function fetchAllLeads(): Promise<AdminLeadRow[]> {
  const [snap, companyNames] = await Promise.all([
    adminDb()
      .collectionGroup("leads")
      .orderBy("createdAt", "desc")
      .limit(300)
      .get(),
    fetchCompanyNames(),
  ]);

  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const companyId = doc.ref.parent.parent?.id ?? "";
    return {
      id: doc.id,
      companyId,
      companyName: companyNames.get(companyId) ?? companyId,
      name: typeof data.name === "string" ? data.name : "-",
      phone: typeof data.phone === "string" ? data.phone : "-",
      email: typeof data.email === "string" ? data.email : "-",
      source: typeof data.source === "string" ? data.source : "other",
      status: typeof data.status === "string" ? data.status : "new",
      assignedToName:
        typeof data.assignedToName === "string" ? data.assignedToName : "-",
      createdAt: serializeDate(data.createdAt),
    };
  });
}

export default async function AdminAllLeadsPage() {
  await requireSuperAdmin();
  const leads = await fetchAllLeads();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("admin.globalLeadsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.globalLeadsSubtitle")}
        </p>
      </header>

      <AdminLeadsClient leads={leads} />
    </div>
  );
}
