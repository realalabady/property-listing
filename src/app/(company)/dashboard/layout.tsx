import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Toaster } from "sonner";
import { requireCompanyMember } from "@/lib/auth/guards";
import { ROUTES } from "@/constants/routes";
import { ROLE_LABELS, ROLES } from "@/constants/roles";
import { adminDb } from "@/lib/firebase/admin";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationsButton } from "@/components/dashboard/NotificationsButton";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialCountdownBanner } from "@/components/dashboard/TrialCountdownBanner";
import { PasswordResetBanner } from "@/components/dashboard/PasswordResetBanner";
import { PermissionDeniedToast } from "@/components/dashboard/PermissionDeniedToast";
import { t } from "@/lib/i18n";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireCompanyMember();
  const companyId = user.companyId as string;
  const [companySnap, employeeSnap] = await Promise.all([
    adminDb().doc(`companies/${companyId}`).get(),
    adminDb().doc(`companies/${companyId}/employees/${user.uid}`).get(),
  ]);
  const company = companySnap.exists
    ? (companySnap.data() as Record<string, unknown>)
    : {};
  const companyLogo =
    typeof company.logo === "string" ? company.logo.trim() : "";
  const companyName =
    typeof company.name === "string"
      ? company.name
      : t("dashboard.fallbackTitle");
  const companyStatus =
    typeof company.status === "string" ? company.status : "";
  const trialEndsRaw = company.trialEndsAt;
  const trialEndsAtIso =
    trialEndsRaw &&
    typeof trialEndsRaw === "object" &&
    "toDate" in trialEndsRaw &&
    typeof (trialEndsRaw as { toDate?: unknown }).toDate === "function"
      ? (trialEndsRaw as { toDate: () => Date }).toDate().toISOString()
      : null;
  const passwordResetRequired =
    employeeSnap.exists && employeeSnap.get("passwordResetRequired") === true;
  const userName =
    (employeeSnap.exists && typeof employeeSnap.get("name") === "string"
      ? String(employeeSnap.get("name"))
      : "") ||
    (typeof user.email === "string" ? user.email.split("@")[0] : "") ||
    t("dashboard.teamMember");
  const roleLabel =
    user.role === ROLES.COMPANY_OWNER
      ? t("dashboard.owner")
      : user.role
        ? ROLE_LABELS[user.role]
        : t("dashboard.member");
  const userInitial = (userName.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="enterprise min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors dir="rtl" />
      <Suspense fallback={null}>
        <PermissionDeniedToast />
      </Suspense>
      <aside className="fixed inset-y-0 end-0 z-40 hidden w-64 flex-col border-s border-border bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link
            href={ROUTES.DASHBOARD}
            className="flex min-w-0 items-center gap-2.5"
          >
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={t("dashboard.logoAlt", { name: companyName })}
                className="h-10 w-auto max-w-[140px] rounded-lg border border-border bg-white object-contain p-1"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                {companyName.trim()[0]?.toUpperCase() ?? "C"}
              </div>
            )}
            <span className="truncate text-[15px] font-semibold text-foreground">
              {companyName}
            </span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DashboardSidebar />
        </div>
      </aside>

      <div className="lg:pe-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/90 px-5 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {userInitial}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-foreground">
                {userName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsButton companyId={companyId} />
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          {passwordResetRequired && <PasswordResetBanner />}
          {companyStatus === "trial" && trialEndsAtIso && (
            <TrialCountdownBanner trialEndsAt={trialEndsAtIso} />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
