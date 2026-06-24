import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { ROUTES } from "@/constants/routes";
import { ROLES } from "@/constants/roles";
import { AdminCompanyDetailClient } from "@/features/admin/AdminCompanyDetailClient";
import type { CompanyStatus, SubscriptionPlanId } from "@/types/company";
import { ROLE_LABELS, type Role, isValidRole } from "@/constants/roles";
import { LISTING_STATUS_LABELS } from "@/constants/listing-categories";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "تفاصيل الشركة",
};

const STATUS_KEYS: Record<string, string> = {
  active: "adminForm.statusActive",
  trial: "adminForm.statusTrial",
  suspended: "adminForm.statusSuspended",
  cancelled: "adminForm.statusCancelled",
};
const PLAN_KEYS: Record<string, string> = {
  free: "adminForm.planFree",
  starter: "adminForm.planStarter",
  pro: "adminForm.planPro",
  enterprise: "adminForm.planEnterprise",
};

interface RouteContext {
  params: Promise<{ companyId: string }>;
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
  return date.toLocaleString("ar-SA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseStatus(value: unknown): CompanyStatus {
  if (
    value === "active" ||
    value === "suspended" ||
    value === "trial" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "trial";
}

function parsePlan(value: unknown): SubscriptionPlanId {
  if (
    value === "free" ||
    value === "starter" ||
    value === "pro" ||
    value === "enterprise"
  ) {
    return value;
  }
  return "starter";
}

export default async function AdminCompanyDetailPage(context: RouteContext) {
  await requireSuperAdmin();
  const { companyId } = await context.params;

  const companyRef = adminDb().doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    notFound();
  }

  const [
    kpiSnap,
    employeesAgg,
    listingsAgg,
    leadsAgg,
    ownersSnap,
    employeesSnap,
    listingsSnap,
  ] = await Promise.all([
    adminDb().doc(`companies/${companyId}/kpi/current`).get(),
    adminDb()
      .collection(`companies/${companyId}/employees`)
      .where("active", "==", true)
      .count()
      .get(),
    adminDb().collection(`companies/${companyId}/listings`).count().get(),
    adminDb().collection(`companies/${companyId}/leads`).count().get(),
    adminDb()
      .collection(`companies/${companyId}/employees`)
      .where("role", "==", ROLES.COMPANY_OWNER)
      .where("active", "==", true)
      .limit(2)
      .get(),
    adminDb()
      .collection(`companies/${companyId}/employees`)
      .orderBy("updatedAt", "desc")
      .limit(8)
      .get(),
    adminDb()
      .collection(`companies/${companyId}/listings`)
      .orderBy("updatedAt", "desc")
      .limit(8)
      .get(),
  ]);

  const companyData = companySnap.data() as Record<string, unknown>;
  const kpi = kpiSnap.exists
    ? (kpiSnap.data() as Record<string, unknown>)
    : ({} as Record<string, unknown>);

  const ownerDoc = ownersSnap.docs[0];
  const owner = ownerDoc
    ? {
        uid: ownerDoc.id,
        email:
          typeof ownerDoc.get("email") === "string"
            ? (ownerDoc.get("email") as string)
            : "",
        name:
          typeof ownerDoc.get("name") === "string"
            ? (ownerDoc.get("name") as string)
            : t("adminDetail.ownerFallback"),
        lastSignInAt: serializeDate(ownerDoc.get("lastSignInAt")),
      }
    : null;

  const totalLeads = asNumber(kpi.totalLeads) || leadsAgg.data().count;
  const convertedLeads = asNumber(kpi.convertedLeads);
  const leadConversionRate =
    totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 10000) / 100
      : 0;

  const summary = {
    id: companyId,
    name:
      typeof companyData.name === "string"
        ? companyData.name
        : t("adminDetail.untitled"),
    slug: typeof companyData.slug === "string" ? companyData.slug : "",
    status: parseStatus(companyData.status),
    subscriptionPlan: parsePlan(companyData.subscriptionPlan),
    isDeleted: companyData.isDeleted === true || Boolean(companyData.deletedAt),
    owner,
    metrics: {
      activeEmployees: employeesAgg.data().count,
      listingsUploaded:
        asNumber(kpi.totalListings) > 0
          ? asNumber(kpi.totalListings)
          : listingsAgg.data().count,
      leadsTotal: totalLeads,
      leadsConverted: convertedLeads,
      leadConversionRate,
    },
    lastSignInAt: serializeDate(companyData.lastSignInAt),
    createdAt: serializeDate(companyData.createdAt),
    updatedAt: serializeDate(companyData.updatedAt),
  };

  const recentEmployees = employeesSnap.docs.map((doc) => ({
    id: doc.id,
    name:
      typeof doc.get("name") === "string"
        ? (doc.get("name") as string)
        : t("dashPages.employeeFallback"),
    email:
      typeof doc.get("email") === "string" ? (doc.get("email") as string) : "",
    role:
      typeof doc.get("role") === "string"
        ? (doc.get("role") as string)
        : "viewer",
    updatedAt: serializeDate(doc.get("updatedAt")),
  }));

  const recentListings = listingsSnap.docs.map((doc) => ({
    id: doc.id,
    title:
      typeof doc.get("title") === "string"
        ? (doc.get("title") as string)
        : t("adminDetail.untitledListing"),
    status:
      typeof doc.get("status") === "string"
        ? (doc.get("status") as string)
        : "draft",
    updatedAt: serializeDate(doc.get("updatedAt")),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {summary.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {summary.slug || summary.id}
          </p>
        </div>

        <Link
          href={ROUTES.ADMIN_COMPANIES}
          className="rounded-md border border-border px-3 py-2 text-sm font-semibold transition hover:bg-secondary"
        >
          {t("adminDetail.backToCompanies")}
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card
          label={t("adminDetail.status")}
          value={t(STATUS_KEYS[summary.status] ?? summary.status)}
        />
        <Card
          label={t("adminDetail.plan")}
          value={t(PLAN_KEYS[summary.subscriptionPlan] ?? summary.subscriptionPlan)}
        />
        <Card
          label={t("adminDetail.activeEmployees")}
          value={String(summary.metrics.activeEmployees)}
        />
        <Card
          label={t("adminDetail.unitsUploaded")}
          value={String(summary.metrics.listingsUploaded)}
        />
        <Card
          label={t("adminDetail.leadConversion")}
          value={`${summary.metrics.leadConversionRate}%`}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card
          label={t("adminDetail.leadsTotal")}
          value={String(summary.metrics.leadsTotal)}
        />
        <Card
          label={t("adminDetail.leadsConverted")}
          value={String(summary.metrics.leadsConverted)}
        />
        <Card
          label={t("adminDetail.lastSignIn")}
          value={formatDate(summary.lastSignInAt)}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold">{t("adminDetail.owner")}</h3>
        {summary.owner ? (
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                {summary.owner.name}
              </span>
            </p>
            <p>{summary.owner.email}</p>
            <p>
              {t("adminDetail.lastSignInLabel", {
                value: formatDate(summary.owner.lastSignInAt),
              })}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("adminDetail.noOwner")}
          </p>
        )}
      </section>

      <AdminCompanyDetailClient
        company={{
          id: summary.id,
          name: summary.name,
          status: summary.status,
          subscriptionPlan: summary.subscriptionPlan,
          isDeleted: summary.isDeleted,
          owner: summary.owner,
        }}
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">
              {t("adminDetail.recentEmployees")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("adminDetail.colName")}</th>
                  <th className="px-4 py-3">{t("adminDetail.colRole")}</th>
                  <th className="px-4 py-3">{t("adminDetail.colUpdated")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-muted-foreground">
                      {t("adminDetail.noEmployeeRecords")}
                    </td>
                  </tr>
                ) : (
                  recentEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-foreground">
                          {employee.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employee.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {isValidRole(employee.role)
                          ? ROLE_LABELS[employee.role as Role]
                          : employee.role}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatDate(employee.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">
              {t("adminDetail.recentUnits")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("adminDetail.colTitle")}</th>
                  <th className="px-4 py-3">{t("adminDetail.colStatus")}</th>
                  <th className="px-4 py-3">{t("adminDetail.colUpdated")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentListings.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-muted-foreground">
                      {t("adminDetail.noUnits")}
                    </td>
                  </tr>
                ) : (
                  recentListings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-4 py-4 font-medium text-foreground">
                        {listing.title}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {LISTING_STATUS_LABELS[
                          listing.status as keyof typeof LISTING_STATUS_LABELS
                        ]?.ar ?? listing.status}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatDate(listing.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <p className="text-xs text-muted-foreground">
        {t("adminDetail.createdUpdated", {
          created: formatDate(summary.createdAt),
          updated: formatDate(summary.updatedAt),
        })}
      </p>
    </div>
  );
}

function Card({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </p>
    </article>
  );
}
