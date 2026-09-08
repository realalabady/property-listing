"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  confirmPasswordReset,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from "firebase/auth";
import { CheckCircle2, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

/**
 * In-app password reset handler.
 *
 * Replaces Firebase's hosted `__/auth/action` page. The `oobCode` arrives from
 * the branded link built by `buildPasswordResetUrl`; the client SDK verifies
 * and consumes it here.
 *
 * On success we sign the user straight in with the password they just chose
 * and clear their `passwordResetRequired` flag, so a new employee's first link
 * lands them inside the product instead of back at a login form.
 */

type Phase = "verifying" | "invalid" | "form" | "submitting" | "success";

const MIN_LENGTH = 8;

/** `ahmed@gmail.com` → `ah•••d@gmail.com`. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}•••@${domain}`;
  return `${local.slice(0, 2)}•••${local.slice(-1)}@${domain}`;
}

interface Strength {
  score: 0 | 1 | 2 | 3;
  label: string;
  barClass: string;
}

/**
 * Deliberately coarse: length plus character variety. This is a hint to the
 * user, not a security control — the real minimum is enforced on submit.
 */
function scorePassword(value: string): Strength {
  if (!value) {
    return { score: 0, label: "", barClass: "bg-border" };
  }

  let points = 0;
  if (value.length >= MIN_LENGTH) points += 1;
  if (value.length >= 12) points += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) points += 1;
  if (/\d/.test(value)) points += 1;
  if (/[^A-Za-z0-9]/.test(value)) points += 1;

  if (points <= 2) {
    return { score: 1, label: t("auth.strengthWeak"), barClass: "bg-destructive" };
  }
  if (points <= 3) {
    return { score: 2, label: t("auth.strengthMedium"), barClass: "bg-warning" };
  }
  return { score: 3, label: t("auth.strengthStrong"), barClass: "bg-success" };
}

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const oobCode = params.get("oobCode");

  const [phase, setPhase] = useState<Phase>("verifying");
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify the code before showing any field: proving the page knows whose
  // account this is, up front, is what a phishing page cannot do.
  useEffect(() => {
    if (!oobCode) {
      setPhase("invalid");
      return;
    }

    let cancelled = false;
    verifyPasswordResetCode(getFirebaseAuth(), oobCode)
      .then((email) => {
        if (cancelled) return;
        setAccountEmail(email);
        setPhase("form");
      })
      .catch(() => {
        if (!cancelled) setPhase("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  const strength = scorePassword(password);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!oobCode) return;
      setError(null);

      if (password.length < MIN_LENGTH) {
        setError(t("auth.passwordMin"));
        return;
      }
      if (password !== confirm) {
        setError(t("auth.passwordsMismatch"));
        return;
      }

      setPhase("submitting");
      const auth = getFirebaseAuth();

      try {
        await confirmPasswordReset(auth, oobCode, password);
      } catch {
        // The code is single-use, so a failure here means it expired or was
        // already spent — send them back to request a fresh one.
        setPhase("invalid");
        return;
      }

      setPhase("success");

      // Best-effort auto sign-in. The password is already changed at this
      // point, so every failure below falls back to /login rather than
      // surfacing an error the user can act on.
      try {
        const cred = await signInWithEmailAndPassword(
          auth,
          accountEmail,
          password,
        );
        const idToken = await cred.user.getIdToken(true);

        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (!res.ok) throw new Error("SESSION_EXCHANGE_FAILED");

        // Clears the "you're still on a temporary password" dashboard banner.
        await fetch("/api/me/password-reset", { method: "POST" }).catch(
          () => undefined,
        );

        // Hard navigation so the httpOnly session cookie is sent with the
        // request for the dashboard (same reason LoginForm does this).
        window.location.assign(ROUTES.DASHBOARD);
      } catch {
        window.location.assign(`${ROUTES.LOGIN}?reset=1`);
      }
    },
    [oobCode, password, confirm, accountEmail],
  );

  if (phase === "verifying") {
    return (
      <AuthShell title={t("auth.setNewPasswordTitle")}>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2
            className="h-6 w-6 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground" role="status">
            {t("auth.verifyingLink")}
          </p>
        </div>
      </AuthShell>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthShell title={t("auth.linkInvalidTitle")}>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert
              className="h-6 w-6 text-destructive"
              aria-hidden="true"
            />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("auth.linkInvalidBody")}
          </p>
          <Button asChild className="mt-1 w-full">
            <Link href={ROUTES.LOGIN}>{t("auth.requestNewLink")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (phase === "success") {
    return (
      <AuthShell title={t("auth.passwordUpdatedTitle")}>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground" role="status">
            {t("auth.passwordUpdatedBody")}
          </p>
        </div>
      </AuthShell>
    );
  }

  const busy = phase === "submitting";

  return (
    <AuthShell
      title={t("auth.setNewPasswordTitle")}
      subtitle={t("auth.setNewPasswordSubtitle")}
      aside={{
        heading: t("auth.resetAsideHeading"),
        points: [
          t("auth.resetAsidePoint1"),
          t("auth.resetAsidePoint2"),
          t("auth.resetAsidePoint3"),
        ],
      }}
      footer={
        <Link href={ROUTES.LOGIN} className="font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-[hsl(274_60%_30%)] hover:decoration-primary">
          {t("auth.backToSignIn")}
        </Link>
      }
    >
      {/* The account being changed. A phishing page can't fill this in. */}
      <div className="mb-5 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
        <p className="text-xs text-muted-foreground">
          {t("auth.resettingFor")}
        </p>
        <p className="mt-0.5 text-sm font-semibold" dir="ltr">
          {maskEmail(accountEmail)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          label={t("common.password")}
          htmlFor="new-password"
          required
          hint={t("auth.passwordMinPlaceholder")}
        >
          <div className="relative">
            <Input
              id="new-password"
              type={reveal ? "text" : "password"}
              required
              autoComplete="new-password"
              autoFocus
              className="pe-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error) || undefined}
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
            >
              {reveal ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>

        {password && (
          <div>
            <div
              className="flex gap-1.5"
              role="img"
              aria-label={`${t("auth.passwordStrength")}: ${strength.label}`}
            >
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    step <= strength.score ? strength.barClass : "bg-border",
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("auth.passwordStrength")}: {strength.label}
            </p>
          </div>
        )}

        <Field
          label={t("auth.confirmPassword")}
          htmlFor="confirm-password"
          required
        >
          <Input
            id="confirm-password"
            type={reveal ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={Boolean(error) || undefined}
          />
        </Field>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <Button type="submit" variant="brand" disabled={busy} className="w-full" size="lg">
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {busy ? t("auth.savingPassword") : t("auth.savePassword")}
        </Button>
      </form>
    </AuthShell>
  );
}
