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
  const inviteCompany = params.get("inviteCompany");
  const inviteId = params.get("inviteId");
  const inviteToken = params.get("token");

  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acceptInvitationAfterLogin(): Promise<void> {
    if (!inviteCompany || !inviteId || !inviteToken) return;

    const res = await fetch(
      `/api/companies/${encodeURIComponent(inviteCompany)}/invitations/${encodeURIComponent(inviteId)}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      },
    );

    if (res.ok) return;

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
      await signIn(email, password);
      await acceptInvitationAfterLogin();
      router.push(next);
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
            {t("auth.signInTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.signInSubtitle")}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
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
            <label className="mb-1.5 block text-sm font-medium">
              {t("common.password")}
            </label>
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
      </div>
    </main>
  );
}
