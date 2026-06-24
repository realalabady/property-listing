"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ROUTES } from "@/constants/routes";
import { t } from "@/lib/i18n";

interface OnboardingFormProps {
  email: string | undefined;
}

interface OnboardingResponse {
  ok?: boolean;
  companyId?: string;
  error?: string;
}

interface SessionResponse {
  error?: string;
}

function normalizeOwnerName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCompanyClaim(
  user: User,
  companyId: string,
  attempts = 8,
): Promise<string> {
  for (let i = 0; i < attempts; i += 1) {
    const tokenResult = await user.getIdTokenResult(true);
    const claimCompanyId =
      typeof tokenResult.claims.companyId === "string"
        ? tokenResult.claims.companyId
        : null;

    if (claimCompanyId === companyId) {
      return user.getIdToken(true);
    }

    await wait(600);
  }

  // Fall back to latest token even if claims propagation is slightly delayed.
  return user.getIdToken(true);
}

async function refreshServerSessionFromCurrentUser(): Promise<void> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error(t("onboarding.sessionExpired"));
  }

  const idToken = await currentUser.getIdToken(true);
  const sessionRes = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!sessionRes.ok) {
    let message = t("onboarding.sessionRefreshFailed");
    try {
      const payload = (await sessionRes.json()) as SessionResponse;
      if (payload.error) message = payload.error;
    } catch {
      // no-op
    }
    throw new Error(message);
  }
}

export default function OnboardingForm({ email }: OnboardingFormProps) {
  const router = useRouter();

  const initialOwnerName = useMemo(() => {
    if (!email) return "";
    const local = email.split("@")[0] || "";
    return local
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, [email]);

  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState(initialOwnerName);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const cleanedCompanyName = companyName.trim();
    const cleanedOwnerName = normalizeOwnerName(ownerName);

    if (!cleanedCompanyName) {
      setError(t("onboarding.companyNameRequired"));
      return;
    }

    if (!cleanedOwnerName) {
      setError(t("onboarding.ownerNameRequired"));
      return;
    }

    setBusy(true);

    try {
      const submitOnboarding = async () =>
        fetch("/api/onboarding/company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: cleanedCompanyName,
            ownerName: cleanedOwnerName,
            phone: phone.trim() || null,
          }),
        });

      let onboardingRes = await submitOnboarding();

      // If session cookie was revoked by a previous onboarding run,
      // refresh it from the current Firebase user and retry once.
      if (onboardingRes.status === 401) {
        await refreshServerSessionFromCurrentUser();
        onboardingRes = await submitOnboarding();
      }

      const onboardingPayload =
        (await onboardingRes.json()) as OnboardingResponse;

      if (!onboardingRes.ok || !onboardingPayload.companyId) {
        throw new Error(
          onboardingPayload.error || t("onboarding.createCompanyFailed"),
        );
      }

      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) {
        throw new Error(t("onboarding.sessionExpired"));
      }

      const idToken = await waitForCompanyClaim(
        currentUser,
        onboardingPayload.companyId,
      );

      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!sessionRes.ok) {
        let message = t("onboarding.sessionRefreshFailed");
        try {
          const payload = (await sessionRes.json()) as SessionResponse;
          if (payload.error) message = payload.error;
        } catch {
          // no-op
        }
        throw new Error(message);
      }

      router.push(ROUTES.DASHBOARD);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t("onboarding.onboardingFailed");
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-sm font-medium">
            {t("onboarding.companyName")}
          </span>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
            placeholder={t("onboarding.companyNamePlaceholder")}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-sm font-medium">
            {t("onboarding.ownerName")}
          </span>
          <input
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
            placeholder={t("onboarding.ownerNamePlaceholder")}
          />
        </label>
      </div>

      <label>
        <span className="mb-1.5 block text-sm font-medium">
          {t("onboarding.companyPhone")}
        </span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
          placeholder={t("onboarding.phonePlaceholder")}
        />
      </label>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {busy
          ? t("onboarding.creatingWorkspace")
          : t("onboarding.createWorkspace")}
      </button>
    </form>
  );
}
