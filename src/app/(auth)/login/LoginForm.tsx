"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes";
import { t } from "@/lib/i18n";

function toPublicAuthMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : t("auth.signInFailed");
  const lower = message.toLowerCase();
  if (lower.includes("firebase") || lower.includes("auth/")) {
    return t("auth.authFailed");
  }
  return message;
}

export default function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || ROUTES.DASHBOARD;
  const blocked = params.get("blocked") === "company_inactive";
  const sessionEnded = params.get("idle") === "1";
  const justReset = params.get("reset") === "1";
  const inviteCompany = params.get("inviteCompany");
  const inviteId = params.get("inviteId");
  const inviteToken = params.get("token");

  const { signIn, refreshSession, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [resetSent, setResetSent] = useState(false);

  async function onResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err) {
      setError(toPublicAuthMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: "signin" | "reset") {
    setMode(next);
    setError(null);
    setResetSent(false);
  }

  async function acceptInvitationAfterLogin(): Promise<boolean> {
    if (!inviteCompany || !inviteId || !inviteToken) return false;

    const res = await fetch(
      `/api/companies/${encodeURIComponent(inviteCompany)}/invitations/${encodeURIComponent(inviteId)}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      },
    );

    if (res.ok) return true;

    let message = t("auth.inviteAcceptFailed");
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep default message when response body cannot be parsed.
    }

    throw new Error(message);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fbUser = await signIn(email, password);
      const acceptedInvite = await acceptInvitationAfterLogin();
      if (acceptedInvite) {
        // Accepting the invite granted new claims server-side. Re-mint the
        // session cookie from a fresh ID token so guards see the company role
        // immediately instead of bouncing the user to /onboarding.
        await refreshSession();
      }
      // Customers are not company members — never send them into the dashboard.
      // Force-refresh after an accept so the just-granted role is read here too.
      const { claims } = await fbUser.getIdTokenResult(acceptedInvite);
      // Route by role: customers → marketplace, super admins → admin console,
      // everyone else → their intended destination (default dashboard). This
      // avoids a green flash from super admins landing on /dashboard and being
      // server-redirected to /admin.
      const destination =
        claims.role === "customer"
          ? ROUTES.MARKETPLACE
          : claims.role === "super_admin"
            ? ROUTES.ADMIN
            : next;
      // Hard navigation (not router.push) so the httpOnly session cookie we just
      // set is guaranteed to be sent on the request for `destination`. A soft
      // client navigation could render from a router-cache entry produced before
      // the cookie existed, which made the first click appear to do nothing.
      // Leave `loading` true through the unload so the button stays disabled.
      window.location.assign(destination);
    } catch (err) {
      setError(toPublicAuthMessage(err));
      setLoading(false);
    }
  }

  const errorBanner = error && (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {error}
    </div>
  );

  if (mode === "reset") {
    return (
      <AuthShell
        title={resetSent ? t("auth.resetLinkSentTitle") : t("auth.resetTitle")}
        subtitle={resetSent ? undefined : t("auth.resetSubtitle")}
        footer={
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-[hsl(274_60%_30%)] hover:decoration-primary"
          >
            {t("auth.backToSignIn")}
          </button>
        }
      >
        {resetSent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <MailCheck className="h-12 w-12 text-primary" aria-hidden="true" />
            <p
              className="text-sm leading-relaxed text-muted-foreground"
              role="status"
            >
              {t("auth.resetEmailSent")}
            </p>
          </div>
        ) : (
          <form onSubmit={onResetSubmit} className="space-y-4">
            <Field label={t("common.email")} htmlFor="reset-email" required>
              <Input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
              />
            </Field>

            {errorBanner}

            <Button
              type="submit"
              variant="brand"
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
              {loading ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
            </Button>
          </form>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.signInTitle")}
      subtitle={t("auth.signInSubtitle")}
      aside={{
        heading: t("auth.signInAsideHeading"),
        points: [
          t("auth.signInAsidePoint1"),
          t("auth.signInAsidePoint2"),
          t("auth.signInAsidePoint3"),
        ],
      }}
      footer={
        <Link href={ROUTES.HOME} className="font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-[hsl(274_60%_30%)] hover:decoration-primary">
          {t("auth.goHome")}
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {justReset && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg border border-success/40 bg-success/10 px-3 py-2.5 text-sm text-foreground"
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-success"
              aria-hidden="true"
            />
            <span>{t("auth.passwordUpdatedTitle")}</span>
          </div>
        )}

        {sessionEnded && (
          <div
            role="status"
            className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm"
          >
            <p>{t("auth.sessionEndedIdle")}</p>
            <Link
              href={ROUTES.HOME}
              className="mt-1 inline-block font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-[hsl(274_60%_30%)] hover:decoration-primary"
            >
              {t("auth.goHome")}
            </Link>
          </div>
        )}

        {blocked && (
          <div
            role="alert"
            className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm"
          >
            {t("auth.companyInactive")}
          </div>
        )}

        <Field label={t("common.email")} htmlFor="email" required>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-muted-foreground"
            >
              {t("common.password")}
              <span className="text-destructive"> *</span>
            </label>
            <button
              type="button"
              onClick={() => switchMode("reset")}
              className="text-xs font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-[hsl(274_60%_30%)] hover:decoration-primary"
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordPlaceholder")}
          />
        </div>

        {errorBanner}

        <Button type="submit" variant="brand" disabled={loading} size="lg" className="w-full">
          {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
          {loading ? t("auth.signingIn") : t("auth.signInTitle")}
        </Button>

        <p className="pt-1 text-center text-xs leading-relaxed text-muted-foreground">
          {t("auth.accountsByOwner")}
        </p>
      </form>
    </AuthShell>
  );
}
