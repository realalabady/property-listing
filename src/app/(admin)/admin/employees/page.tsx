import { requireSuperAdmin } from "@/lib/auth/guards";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { t } from "@/lib/i18n";
import { AdminEmployeesClient } from "@/features/admin/AdminEmployeesClient";

export const metadata = {
  title: "كل الموظفين",
};

export interface AdminEmployeeRow {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  /** Real last authentication time from Firebase Auth (ISO), or null. */
  lastSignInAt: string | null;
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

/** Real last-sign-in per uid, read from Firebase Auth in batches of ≤100. */
async function fetchLastSignInMap(
  uids: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const unique = Array.from(new Set(uids));
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100).map((uid) => ({ uid }));
    try {
      const result = await adminAuth().getUsers(chunk);
      for (const user of result.users) {
        map.set(
          user.uid,
          user.metadata.lastSignInTime
            ? new Date(user.metadata.lastSignInTime).toISOString()
            : null,
        );
      }
    } catch {
      // A failed batch leaves those rows as "unknown" rather than erroring out.
    }
  }
  return map;
}

async function fetchAllEmployees(): Promise<AdminEmployeeRow[]> {
  const [snap, companyNames] = await Promise.all([
    adminDb().collectionGroup("employees").limit(1000).get(),
    fetchCompanyNames(),
  ]);

  const lastSignIn = await fetchLastSignInMap(snap.docs.map((doc) => doc.id));

  const rows = snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const companyId = doc.ref.parent.parent?.id ?? "";
    return {
      id: doc.id,
      companyId,
      companyName: companyNames.get(companyId) ?? companyId,
      name:
        typeof data.name === "string" && data.name.trim()
          ? data.name
          : t("dashPages.employeeFallback"),
      email: typeof data.email === "string" ? data.email : "-",
      phone: typeof data.phone === "string" ? data.phone : "-",
      role: typeof data.role === "string" ? data.role : "viewer",
      active: data.active !== false,
      lastSignInAt: lastSignIn.get(doc.id) ?? null,
      createdAt: serializeDate(data.createdAt),
    };
  });

  // Most-recently active first; never-signed-in fall to the bottom.
  rows.sort((a, b) => (b.lastSignInAt ?? "").localeCompare(a.lastSignInAt ?? ""));
  return rows;
}

export default async function AdminAllEmployeesPage() {
  await requireSuperAdmin();
  const employees = await fetchAllEmployees();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("admin.globalEmployeesTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.globalEmployeesSubtitle")}
        </p>
      </header>

      <AdminEmployeesClient employees={employees} />
    </div>
  );
}
