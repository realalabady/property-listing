"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || ROUTES.DASHBOARD;
  const blocked = params.get("blocked") === "company_inactive";
  const sessionEnded = params.get("idle") === "1";
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
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(toPublicAuthMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dar-light flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-lg font-semibold">{t("common.appName")}</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            {mode === "reset" ? t("auth.resetTitle") : t("auth.signInTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "reset"
              ? t("auth.resetSubtitle")
              : t("auth.signInSubtitle")}
          </p>
        </div>

        {mode === "reset" ? (
          <form
            onSubmit={onResetSubmit}
            className="space-y-4 rounded-xl border border-border bg-card p-6"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("common.email")}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>

            {resetSent && (
              <div className="rounded-md border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {t("auth.resetEmailSent")}
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || resetSent}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? t("auth.sendingResetLink")
                : t("auth.sendResetLink")}
            </button>

            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="w-full text-center text-sm font-medium text-primary hover:underline"
            >
              {t("auth.backToSignIn")}
            </button>
          </form>
        ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          {sessionEnded && (
            <div className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p>{t("auth.sessionEndedIdle")}</p>
              <Link
                href="/"
                className="mt-1 inline-block font-medium text-amber-900 underline underline-offset-2 hover:opacity-80"
              >
                {t("auth.goHome")}
              </Link>
            </div>
          )}

          {blocked && (
            <div className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t("auth.companyInactive")}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("common.email")}
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
              placeholder={t("auth.emailPlaceholder")}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium">
                {t("common.password")}
              </label>
              <button
                type="button"
                onClick={() => switchMode("reset")}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
              placeholder={t("auth.passwordPlaceholder")}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("auth.signingIn") : t("auth.signInTitle")}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.accountsByOwner")}
          </p>
        </form>
        )}
      </div>
    </main>
  );
}
