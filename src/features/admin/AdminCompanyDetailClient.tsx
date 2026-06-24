"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyStatus, SubscriptionPlanId } from "@/types/company";
import { t } from "@/lib/i18n";

const PLAN_LABEL_KEYS: Record<SubscriptionPlanId, string> = {
  free: "adminForm.planFree",
  starter: "adminForm.planStarter",
  pro: "adminForm.planPro",
  enterprise: "adminForm.planEnterprise",
};

interface OwnerSummary {
  uid: string;
  email: string;
  name: string;
  lastSignInAt: string | null;
}

interface CompanySummary {
  id: string;
  name: string;
  status: CompanyStatus;
  subscriptionPlan: SubscriptionPlanId;
  isDeleted: boolean;
  owner: OwnerSummary | null;
}

interface ActionResponse {
  ok?: boolean;
  error?: string;
  passwordResetLink?: string;
  temporaryPassword?: string;
  acceptApiUrl?: string;
  suggestedLoginUrl?: string;
  invitationEmailSent?: boolean;
  invitationEmailSkipped?: boolean;
  invitationEmailReason?: string | null;
}

const PLANS: SubscriptionPlanId[] = ["free", "starter", "pro", "enterprise"];

export function AdminCompanyDetailClient({
  company,
}: {
  company: CompanySummary;
}) {
  const router = useRouter();

  const [plan, setPlan] = useState<SubscriptionPlanId>(
    company.subscriptionPlan,
  );
  const [ownerMode, setOwnerMode] = useState<"direct" | "invite">("direct");

  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [inviteExpiresDays, setInviteExpiresDays] = useState("7");

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResponse | null>(null);

  const runCompanyAction = async (
    action: string,
    body?: Record<string, unknown>,
  ) => {
    setBusyAction(action);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });

      const payload = (await response.json()) as ActionResponse;
      if (!response.ok) {
        throw new Error(
          payload.error || t("adminDetail.actionFailedPrefix", { action }),
        );
      }

      setNotice(t("adminDetail.actionCompleted", { action }));
      router.refresh();
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : t("adminDetail.actionFailed");
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  const savePlan = async () => {
    await runCompanyAction("set_plan", { plan });
  };

  const provisionOwner = async () => {
    setBusyAction("owner");
    setError(null);
    setNotice(null);
    setResult(null);

    try {
      const payloadBody =
        ownerMode === "direct"
          ? {
              mode: "direct",
              email: ownerEmail,
              name: ownerName,
              phone: ownerPhone,
              temporaryPassword: temporaryPassword || undefined,
              issueResetLink: true,
            }
          : {
              mode: "invite",
              email: ownerEmail,
              name: ownerName,
              expiresInDays: Number(inviteExpiresDays || "7"),
            };

      const response = await fetch(`/api/admin/companies/${company.id}/owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const payload = (await response.json()) as ActionResponse;
      if (!response.ok) {
        throw new Error(payload.error || t("adminDetail.provisionFailed"));
      }

      setResult(payload);
      const noticeParts = [
        ownerMode === "direct"
          ? t("adminDetail.ownerAssigned")
          : t("adminDetail.ownerInviteCreated"),
      ];

      if (ownerMode === "invite") {
        if (payload.invitationEmailSent) {
          noticeParts.push(t("adminDetail.inviteEmailSent"));
        } else if (payload.invitationEmailSkipped) {
          noticeParts.push(t("adminDetail.inviteEmailSkipped"));
        } else {
          noticeParts.push(t("adminDetail.inviteEmailFailed"));
        }
      }

      setNotice(noticeParts.join(" "));

      setOwnerEmail("");
      setOwnerName("");
      setOwnerPhone("");
      setTemporaryPassword("");
      setInviteExpiresDays("7");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t("adminDetail.provisioningFailed");
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  const createOwnerResetLink = async () => {
    setBusyAction("reset_link");
    setError(null);
    setNotice(null);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/companies/${company.id}/owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "reset_link",
          email: ownerEmail || undefined,
        }),
      });

      const payload = (await response.json()) as ActionResponse;
      if (!response.ok) {
        throw new Error(payload.error || t("adminDetail.resetLinkFailed"));
      }

      setResult(payload);
      setNotice(t("adminDetail.resetLinkGenerated"));
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t("adminDetail.resetLinkError");
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="space-y-3">
        <h3 className="text-base font-semibold">
          {t("adminDetail.companyControls")}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() =>
              runCompanyAction(
                company.status === "suspended" ? "activate" : "suspend",
              )
            }
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
          >
            {busyAction === "suspend" || busyAction === "activate"
              ? t("adminDetail.saving")
              : company.status === "suspended"
                ? t("adminDetail.activateCompany")
                : t("adminDetail.suspendCompany")}
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() =>
              runCompanyAction(company.isDeleted ? "restore" : "soft_delete", {
                reason: "super_admin_action",
              })
            }
            className="rounded-md border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
          >
            {busyAction === "soft_delete" || busyAction === "restore"
              ? t("adminDetail.saving")
              : company.isDeleted
                ? t("adminDetail.restoreCompany")
                : t("adminDetail.softDeleteCompany")}
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label>
            <span className="mb-1.5 block text-sm font-medium">
              {t("adminDetail.plan")}
            </span>
            <select
              value={plan}
              onChange={(event) =>
                setPlan(event.target.value as SubscriptionPlanId)
              }
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
            >
              {PLANS.map((value) => (
                <option key={value} value={value}>
                  {t(PLAN_LABEL_KEYS[value])}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={savePlan}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busyAction === "set_plan"
              ? t("adminDetail.saving")
              : t("adminDetail.updatePlan")}
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-base font-semibold">
          {t("adminDetail.ownerProvisioning")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("adminDetail.ownerProvisioningHint")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("adminDetail.ownerEmailHint")}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOwnerMode("direct")}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              ownerMode === "direct"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-secondary"
            }`}
          >
            {t("adminDetail.directAccount")}
          </button>
          <button
            type="button"
            onClick={() => setOwnerMode("invite")}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              ownerMode === "invite"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-secondary"
            }`}
          >
            {t("adminDetail.inviteOwner")}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label={t("adminDetail.ownerEmail")}
            value={ownerEmail}
            onChange={setOwnerEmail}
            placeholder="owner@company.com"
          />
          <Field
            label={t("adminDetail.ownerName")}
            value={ownerName}
            onChange={setOwnerName}
            placeholder={t("adminDetail.ownerNamePlaceholder")}
          />

          {ownerMode === "direct" ? (
            <>
              <Field
                label={t("adminDetail.ownerPhoneOptional")}
                value={ownerPhone}
                onChange={setOwnerPhone}
                placeholder="+966..."
              />
              <Field
                label={t("adminDetail.tempPasswordOptional")}
                value={temporaryPassword}
                onChange={setTemporaryPassword}
                placeholder={t("adminDetail.tempPasswordPlaceholder")}
              />
            </>
          ) : (
            <Field
              label={t("adminDetail.inviteExpiryDays")}
              value={inviteExpiresDays}
              onChange={setInviteExpiresDays}
              placeholder="7"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={provisionOwner}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busyAction === "owner"
              ? t("adminDetail.processing")
              : ownerMode === "direct"
                ? t("adminDetail.assignOwnerAccount")
                : t("adminDetail.createOwnerInvitation")}
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={createOwnerResetLink}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
          >
            {busyAction === "reset_link"
              ? t("adminDetail.generating")
              : t("adminDetail.generateResetLink")}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {notice}
        </p>
      )}

      {result && (
        <div className="space-y-2 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
          {typeof result.invitationEmailSent === "boolean" && (
            <p>
              {t("adminDetail.inviteEmailStatus")}{" "}
              <span className="font-semibold text-foreground">
                {result.invitationEmailSent
                  ? t("adminDetail.statusSent")
                  : result.invitationEmailSkipped
                    ? t("adminDetail.statusSkipped")
                    : t("adminDetail.statusFailed")}
              </span>
            </p>
          )}
          {result.invitationEmailReason && (
            <p>
              {t("adminDetail.emailErrorLabel")}{" "}
              <span className="font-semibold text-foreground">
                {result.invitationEmailReason}
              </span>
            </p>
          )}
          {result.temporaryPassword && (
            <p>
              {t("adminDetail.tempPasswordLabel")}{" "}
              <span className="font-semibold text-foreground">
                {result.temporaryPassword}
              </span>
            </p>
          )}
          {result.passwordResetLink && (
            <p className="break-all">
              {t("adminDetail.resetLinkLabel")}{" "}
              <span className="text-foreground">
                {result.passwordResetLink}
              </span>
            </p>
          )}
          {result.suggestedLoginUrl && (
            <p className="break-all">
              {t("adminDetail.suggestedLoginLabel")}{" "}
              <span className="text-foreground">
                {result.suggestedLoginUrl}
              </span>
            </p>
          )}
          {result.acceptApiUrl && (
            <p className="break-all">
              {t("adminDetail.acceptUrlLabel")}{" "}
              <span className="text-foreground">{result.acceptApiUrl}</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function Field({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
