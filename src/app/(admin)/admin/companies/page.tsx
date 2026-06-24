import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { ROUTES } from "@/constants/routes";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "الشركات",
};

interface CompanyListRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscriptionPlan: string;
  activeEmployees: number;
  listingsUploaded: number;
  totalLeads: number;
  convertedLeads: number;
  leadConversionRate: number;
  lastSignInAt: string | null;
  createdAt: string | null;
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
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
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchCompanies(): Promise<CompanyListRow[]> {
  const snap = await adminDb()
    .collection("companies")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const rows = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data() as Record<string, unknown>;
      const kpiSnap = await adminDb()
        .doc(`companies/${doc.id}/kpi/current`)
        .get();
      const kpi = kpiSnap.exists
        ? (kpiSnap.data() as Record<string, unknown>)
        : ({} as Record<string, unknown>);

      const totalLeads = asNumber(kpi.totalLeads);
      const convertedLeads = asNumber(kpi.convertedLeads);
      const leadConversionRate =
        totalLeads > 0
          ? Math.round((convertedLeads / totalLeads) * 10000) / 100
          : 0;

      return {
        id: doc.id,
        name:
          typeof data.name === "string"
            ? data.name
            : t("admin.untitledCompany"),
        slug: typeof data.slug === "string" ? data.slug : "",
        status: typeof data.status === "string" ? data.status : "trial",
        subscriptionPlan:
          typeof data.subscriptionPlan === "string"
            ? data.subscriptionPlan
            : "starter",
        activeEmployees:
          asNumber(kpi.totalEmployees) ||
          (typeof data.activeEmployeesCount === "number"
            ? data.activeEmployeesCount
            : 0),
        listingsUploaded:
          asNumber(kpi.totalListings) ||
          (typeof data.listingsCount === "number" ? data.listingsCount : 0),
        totalLeads,
        convertedLeads,
        leadConversionRate,
        lastSignInAt: serializeDate(data.lastSignInAt),
        createdAt: serializeDate(data.createdAt),
      };
    }),
  );

  return rows;
}

const STATUS_CLASS: Record<string, string> = {
  active: "bg-success/20 text-success",
  trial: "bg-warning/20 text-warning-foreground",
  suspended: "bg-destructive/20 text-destructive",
  cancelled: "bg-secondary text-secondary-foreground",
};

const STATUS_KEYS: Record<string, string> = {
  active: "admin.active",
  trial: "admin.trial",
  suspended: "admin.suspended",
  cancelled: "admin.cancelled",
};

function companyStatusLabel(status: string): string {
  return STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status;
}

export default async function AdminCompaniesPage() {
  await requireSuperAdmin();
  const companies = await fetchCompanies();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("admin.companiesTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("admin.companiesSubtitleFull")}
          </p>
        </div>

        <Link
          href={ROUTES.ADMIN_COMPANY_NEW}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {t("admin.createCompany")}
        </Link>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("admin.colCompany")}</th>
                <th className="px-4 py-3">{t("admin.colStatus")}</th>
                <th className="px-4 py-3">{t("admin.colPlan")}</th>
                <th className="px-4 py-3">{t("admin.colEmployees")}</th>
                <th className="px-4 py-3">{t("admin.colUnits")}</th>
                <th className="px-4 py-3">{t("admin.colLeads")}</th>
                <th className="px-4 py-3">{t("admin.colConversion")}</th>
                <th className="px-4 py-3">{t("admin.colLastSignIn")}</th>
                <th className="px-4 py-3">{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("admin.noCompanies")}
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id}>
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">
                        {company.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company.slug || company.id}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_CLASS[company.status] ??
                          "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {companyStatusLabel(company.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 capitalize">
                      {company.subscriptionPlan}
                    </td>
                    <td className="px-4 py-4">{company.activeEmployees}</td>
                    <td className="px-4 py-4">{company.listingsUploaded}</td>
                    <td className="px-4 py-4">
                      {company.totalLeads} / {company.convertedLeads}
                    </td>
                    <td className="px-4 py-4">{company.leadConversionRate}%</td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(company.lastSignInAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={ROUTES.ADMIN_COMPANY_DETAIL(company.id)}
                        className="rounded-md border border-border px-2 py-1 text-xs font-semibold transition hover:bg-secondary"
                      >
                        {t("admin.view")}
                      </Link>
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
