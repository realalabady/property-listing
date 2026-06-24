"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import type { CompanyStatus, SubscriptionPlanId } from "@/types/company";
import { t } from "@/lib/i18n";

const PLANS: SubscriptionPlanId[] = ["free", "starter", "pro", "enterprise"];
const STATUSES: CompanyStatus[] = ["trial", "active", "suspended", "cancelled"];

const PLAN_LABEL_KEYS: Record<SubscriptionPlanId, string> = {
  free: "adminForm.planFree",
  starter: "adminForm.planStarter",
  pro: "adminForm.planPro",
  enterprise: "adminForm.planEnterprise",
};

const STATUS_LABEL_KEYS: Record<CompanyStatus, string> = {
  trial: "adminForm.statusTrial",
  active: "adminForm.statusActive",
  suspended: "adminForm.statusSuspended",
  cancelled: "adminForm.statusCancelled",
};

interface CreateCompanyResponse {
  ok?: boolean;
  error?: string;
  company?: {
    id: string;
    name: string;
    slug: string;
    subscriptionPlan: SubscriptionPlanId;
    status: CompanyStatus;
  };
}

export function AdminCreateCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlanId>("starter");
  const [status, setStatus] = useState<CompanyStatus>("trial");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          subscriptionPlan: plan,
          status,
          description,
          contactEmail,
          contactPhone,
        }),
      });

      const payload = (await response.json()) as CreateCompanyResponse;
      if (!response.ok || !payload.company) {
        throw new Error(payload.error || t("adminForm.createFailed"));
      }

      setNotice(t("adminForm.createdNotice"));
      router.push(ROUTES.ADMIN_COMPANY_DETAIL(payload.company.id));
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t("adminForm.createFailed");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-border bg-card p-6"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label={t("adminForm.companyName")}
          value={name}
          onChange={setName}
          placeholder={t("adminForm.companyNamePlaceholder")}
          required
        />
        <Field
          label={t("adminForm.slugOptional")}
          value={slug}
          onChange={setSlug}
          placeholder={t("adminForm.slugPlaceholder")}
        />

        <SelectField
          label={t("adminForm.plan")}
          value={plan}
          onChange={(value) => setPlan(value as SubscriptionPlanId)}
          options={PLANS.map((value) => ({
            value,
            label: t(PLAN_LABEL_KEYS[value]),
          }))}
        />
        <SelectField
          label={t("adminForm.status")}
          value={status}
          onChange={(value) => setStatus(value as CompanyStatus)}
          options={STATUSES.map((value) => ({
            value,
            label: t(STATUS_LABEL_KEYS[value]),
          }))}
        />

        <Field
          label={t("adminForm.contactEmailOptional")}
          value={contactEmail}
          onChange={setContactEmail}
          placeholder="owner@company.com"
        />
        <Field
          label={t("adminForm.contactPhoneOptional")}
          value={contactPhone}
          onChange={setContactPhone}
          placeholder="+966..."
        />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          {t("adminForm.description")}
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
          placeholder={t("adminForm.descriptionPlaceholder")}
        />
      </label>

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

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? t("adminForm.creating") : t("adminForm.createCompany")}
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

function Field({ label, value, onChange, placeholder, required }: FieldProps) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
