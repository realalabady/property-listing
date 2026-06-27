import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { ROLE_LABELS, ROLES, isValidRole, type Role } from "@/constants/roles";
import { adminDb } from "@/lib/firebase/admin";
import { serializeDate } from "@/lib/api/company-leads";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { EmployeeKPIMetrics } from "@/types/user";

export const metadata = {
  title: "تفاصيل الموظف",
};

function fmtDate(value: unknown): string {
  const iso = serializeDate(value);
  return iso ? formatDate(iso) : "—";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className="mt-1.5 text-2xl font-bold"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCompanyMember();

  const canViewEmployees = hasAnyPermission(user.permissions, [
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.CREATE_EMPLOYEE,
    PERMISSIONS.EDIT_EMPLOYEE,
    PERMISSIONS.REMOVE_EMPLOYEE,
  ]);
  if (!canViewEmployees || !user.companyId) {
    redirect(ROUTES.DASHBOARD);
  }

  const snap = await adminDb()
    .doc(`companies/${user.companyId}/employees/${id}`)
    .get();
  if (!snap.exists) notFound();

  const data = snap.data() as Record<string, unknown>;
  const role: Role =
    typeof data.role === "string" && isValidRole(data.role)
      ? (data.role as Role)
      : ROLES.VIEWER;
  const name = typeof data.name === "string" ? data.name : "موظف";
  const email = typeof data.email === "string" ? data.email : "—";
  const active = data.active !== false;
  const kpi = (data.kpi ?? {}) as Partial<EmployeeKPIMetrics>;

  const leadsAssigned = num(kpi.leadsAssigned);
  const leadsConverted = num(kpi.leadsConverted);
  const conversionRate =
    leadsAssigned > 0 ? Math.round((leadsConverted / leadsAssigned) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.DASHBOARD_EMPLOYEES}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى الموظفين
      </Link>

      <PageHeader
        title={name}
        description={email}
        actions={
          <span
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold",
              active
                ? "bg-success/20 text-success"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {active ? "نشِط" : "غير نشِط"}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile */}
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
          <h2 className="mb-3 text-base font-semibold">المعلومات الشخصية</h2>
          <InfoRow label="الدور" value={ROLE_LABELS[role] ?? role} />
          <InfoRow
            label="المسمى الوظيفي"
            value={typeof data.title === "string" && data.title ? data.title : "—"}
          />
          <InfoRow
            label="القسم"
            value={
              typeof data.department === "string" && data.department
                ? data.department
                : "—"
            }
          />
          <InfoRow
            label="رقم الجوال"
            value={typeof data.phone === "string" && data.phone ? data.phone : "—"}
          />
          <InfoRow label="تاريخ الانضمام" value={fmtDate(data.joinedAt)} />
          <InfoRow label="آخر نشاط" value={fmtDate(data.lastActiveAt)} />
          <InfoRow label="تاريخ الإنشاء" value={fmtDate(data.createdAt)} />
          <InfoRow label="آخر تحديث" value={fmtDate(data.updatedAt)} />
        </section>

        {/* KPI */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold">مؤشرات الأداء</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <KpiCard
              label="عقارات أُنشئت"
              value={String(num(kpi.listingsCreated))}
              accent="#662d91"
            />
            <KpiCard
              label="عقارات نشطة"
              value={String(num(kpi.listingsActive))}
            />
            <KpiCard label="مكالمات" value={String(num(kpi.callsMade))} />
            <KpiCard
              label="عملاء مُسندون"
              value={String(leadsAssigned)}
              accent="#0071bc"
            />
            <KpiCard
              label="عملاء محوّلون"
              value={String(leadsConverted)}
              accent="#00a99d"
            />
            <KpiCard label="نسبة التحويل" value={`${conversionRate}%`} />
            <KpiCard label="صفقات مغلقة" value={String(num(kpi.dealsClosed))} />
            <KpiCard
              label="متوسط زمن الاستجابة"
              value={`${num(kpi.avgResponseMinutes)} د`}
            />
            <KpiCard
              label="مهام مكتملة"
              value={String(num(kpi.tasksCompleted))}
            />
            <KpiCard
              label="مهام متأخرة"
              value={String(num(kpi.tasksOverdue))}
              accent={num(kpi.tasksOverdue) > 0 ? "#ef4444" : undefined}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            آخر تحديث للمؤشرات: {fmtDate(kpi.lastUpdatedAt)}
          </p>
        </section>
      </div>
    </div>
  );
}
