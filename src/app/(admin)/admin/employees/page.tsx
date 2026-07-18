import { requireSuperAdmin } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { ROLE_LABELS, isValidRole, type Role } from "@/constants/roles";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "كل الموظفين",
};

interface AdminEmployeeRow {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
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

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ar-SA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role: string): string {
  return isValidRole(role) ? ROLE_LABELS[role as Role] : role;
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

async function fetchAllEmployees(): Promise<AdminEmployeeRow[]> {
  const [snap, companyNames] = await Promise.all([
    adminDb()
      .collectionGroup("employees")
      .orderBy("createdAt", "desc")
      .limit(500)
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
      name:
        typeof data.name === "string" && data.name.trim()
          ? data.name
          : t("dashPages.employeeFallback"),
      email: typeof data.email === "string" ? data.email : "-",
      phone: typeof data.phone === "string" ? data.phone : "-",
      role: typeof data.role === "string" ? data.role : "viewer",
      active: data.active !== false,
      lastSignInAt: serializeDate(data.lastSignInAt),
      createdAt: serializeDate(data.createdAt),
    };
  });
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

      <p className="text-sm text-muted-foreground">
        {t("admin.totalCount", { count: employees.length })}
      </p>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("admin.colName")}</th>
                <th className="px-4 py-3">{t("admin.colCompany")}</th>
                <th className="px-4 py-3">{t("admin.colPhone")}</th>
                <th className="px-4 py-3">{t("admin.colRole")}</th>
                <th className="px-4 py-3">{t("admin.colStatus")}</th>
                <th className="px-4 py-3">{t("admin.colLastSignIn")}</th>
                <th className="px-4 py-3">{t("admin.colCreatedAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("admin.noEmployees")}
                  </td>
                </tr>
              ) : (
                employees.map((row) => (
                  <tr key={`${row.companyId}-${row.id}`}>
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.email}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.companyName}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.phone}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {roleLabel(row.role)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.active
                            ? "bg-success/20 text-success"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {row.active
                          ? t("admin.activeBadge")
                          : t("admin.inactiveBadge")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(row.lastSignInAt)}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
