import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth, getCompanyBlockReasonForUser } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { ROUTES } from "@/constants/routes";
import { ROLES } from "@/constants/roles";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { t } from "@/lib/i18n";

// Never cache — the block state must be read live on every visit.
export const dynamic = "force-dynamic";

/**
 * Terminal screen shown when a company's plan/trial has ended. The dashboard
 * guard (`requireCompanyMember`) redirects here for billing/trial blocks so the
 * user gets a clear "renew or contact support" message instead of being
 * silently bounced to the login page. This page intentionally does NOT call
 * `requireCompanyMember` (that would loop); it verifies auth itself and, if the
 * company is actually active, sends the user back to their dashboard.
 */
export default async function PlanEndedPage() {
  const user = await requireAuth();

  // Route non-company users to where they belong (they can't have a plan).
  if (user.role === ROLES.SUPER_ADMIN) redirect(ROUTES.ADMIN);
  if (user.role === ROLES.CUSTOMER) redirect(ROUTES.MARKETPLACE);
  if (!user.companyId) redirect(ROUTES.ONBOARDING);

  const reason = await getCompanyBlockReasonForUser(user);

  // A missing/deleted company is an auth problem, not a billing one.
  if (reason === "missing") {
    redirect(`${ROUTES.LOGIN}?reauth=1&blocked=company_inactive`);
  }
  // Company is fine — this page shouldn't be reachable, send them home.
  if (!reason) redirect(ROUTES.DASHBOARD);

  const companySnap = await adminDb().doc(`companies/${user.companyId}`).get();
  const company = companySnap.exists
    ? (companySnap.data() as Record<string, unknown>)
    : {};
  const companyName =
    typeof company.name === "string" ? company.name : t("common.appName");

  const heading =
    reason === "trial_expired"
      ? t("planEnded.trialTitle")
      : t("planEnded.planTitle");
  const body =
    reason === "trial_expired"
      ? t("planEnded.trialBody")
      : t("planEnded.planBody");

  // Optional platform support channels (shown only when configured).
  const supportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim();
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  const whatsappHref = supportWhatsapp
    ? `https://wa.me/${supportWhatsapp.replace(/[^\d]/g, "")}`
    : null;

  return (
    <main
      dir="rtl"
      className="dar-light flex min-h-screen items-center justify-center bg-background px-4 text-foreground"
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <svg
            className="h-8 w-8 text-destructive"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <p className="mb-1 text-sm text-muted-foreground">{companyName}</p>
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {t("planEnded.contactWhatsapp")}
            </a>
          )}
          {supportEmail && (
            <a
              href={`mailto:${supportEmail}`}
              className="w-full rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              {t("planEnded.contactEmail")}
            </a>
          )}
          {!whatsappHref && !supportEmail && (
            <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              {t("planEnded.contactGeneric")}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <LogoutButton />
          <Link
            href={ROUTES.LOGIN}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("planEnded.backToLogin")}
          </Link>
        </div>
      </div>
    </main>
  );
}
