import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";
import { ROUTES } from "@/constants/routes";
import OnboardingForm from "./OnboardingForm";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "إعداد الحساب",
};

export default async function OnboardingPage() {
  const isPublicOnboardingEnabled =
    process.env.ALLOW_PUBLIC_ONBOARDING === "true";
  const user = await requireAuth();

  if (user.companyId) {
    redirect(ROUTES.DASHBOARD);
  }

  if (!isPublicOnboardingEnabled) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center px-4 py-12">
        <section className="w-full rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("onboarding.inviteOnly")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("onboarding.inviteOnlyBody")}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={ROUTES.LOGIN}
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              {t("onboarding.backToLogin")}
            </Link>
            <Link
              href={ROUTES.HOME}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {t("onboarding.goHome")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center px-4 py-12">
      <section className="w-full rounded-xl border border-border bg-card p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("onboarding.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("onboarding.subtitle")}
        </p>

        <div className="mt-6 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
          {t("onboarding.note")}
        </div>

        <div className="mt-6">
          <OnboardingForm email={user.email} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={ROUTES.LOGIN}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            {t("onboarding.backToLogin")}
          </Link>
          <Link
            href={ROUTES.HOME}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {t("onboarding.goHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
