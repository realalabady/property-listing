"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes";
import { t } from "@/lib/i18n";

function toPublicAuthMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : t("auth.unableCreateAccount");
  const lower = message.toLowerCase();
  if (lower.includes("firebase") || lower.includes("auth/")) {
    return t("auth.authFailed");
  }
  return message;
}

export default function SignupForm() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("auth.passwordMin"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      router.push(ROUTES.ONBOARDING);
      router.refresh();
    } catch (submitError) {
      setError(toPublicAuthMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dar-light flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-lg font-semibold">{t("common.appName")}</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            {t("auth.createAccountTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.createAccountSubtitle")}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <Field
            label={t("common.email")}
            type="email"
            value={email}
            autoComplete="email"
            onChange={setEmail}
            placeholder={t("auth.ownerEmailPlaceholder")}
          />
          <Field
            label={t("common.password")}
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={setPassword}
            placeholder={t("auth.passwordMinPlaceholder")}
          />
          <Field
            label={t("auth.confirmPassword")}
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            onChange={setConfirmPassword}
            placeholder={t("auth.reenterPassword")}
          />

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link
              href={ROUTES.LOGIN}
              className="font-medium text-foreground hover:underline"
            >
              {t("auth.signInTitle")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

interface FieldProps {
  label: string;
  type: "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
}: FieldProps) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
