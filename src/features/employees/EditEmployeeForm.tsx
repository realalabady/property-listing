"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  isValidNationalId,
  isValidSaudiPhone,
  normalizeSaudiPhone,
} from "@/lib/utils/validation";
import { t } from "@/lib/i18n";

export interface EditEmployeeInitial {
  name: string;
  role: Role;
  phone: string;
  nationalId: string;
  title: string;
  department: string;
  active: boolean;
}

export function EditEmployeeForm({
  companyId,
  employeeId,
  initial,
  isSelf,
}: {
  companyId: string;
  employeeId: string;
  initial: EditEmployeeInitial;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Always include the current role even if it isn't in the assignable list
  // (e.g. company owner) so the select can display it.
  const roleOptions = useMemo(() => {
    const roles = new Set<Role>(ASSIGNABLE_ROLES);
    roles.add(initial.role);
    return Array.from(roles);
  }, [initial.role]);

  const errors = useMemo(() => {
    const e: { name?: string; nationalId?: string; phone?: string } = {};
    if (form.name.trim().length < 2) e.name = t("common.fieldRequired");
    if (!form.nationalId.trim()) e.nationalId = t("common.fieldRequired");
    else if (!isValidNationalId(form.nationalId))
      e.nationalId = t("common.invalidNationalId");
    if (form.phone.trim() && !isValidSaudiPhone(form.phone))
      e.phone = t("common.invalidPhone");
    return e;
  }, [form]);

  function set<K extends keyof EditEmployeeInitial>(
    key: K,
    value: EditEmployeeInitial[K],
  ) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function save() {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      setError(t("common.fixErrors"));
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/employees/${employeeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            role: form.role,
            nationalId: form.nationalId.trim(),
            phone: form.phone.trim()
              ? normalizeSaudiPhone(form.phone)
              : undefined,
            title: form.title.trim() || undefined,
            department: form.department.trim() || undefined,
            active: form.active,
          }),
        },
      );
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || t("employeesDash.updateFailed"));
      }
      setNotice(t("employeesDash.employeeUpdated"));
      router.push(ROUTES.DASHBOARD_EMPLOYEE_DETAIL(employeeId));
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("employeesDash.updateFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
        <Field
          label={t("employeesDash.fullName")}
          required
          error={submitted ? errors.name : undefined}
        >
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={Boolean(submitted && errors.name)}
          />
        </Field>

        <Field label={t("employeesDash.role")} required>
          <Select
            value={form.role}
            onChange={(e) => set("role", e.target.value as Role)}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role] ?? role}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={t("employeesDash.nationalId")}
          required
          error={submitted ? errors.nationalId : undefined}
        >
          <Input
            value={form.nationalId}
            onChange={(e) => set("nationalId", e.target.value)}
            placeholder={t("employeesDash.nationalIdPlaceholder")}
            inputMode="numeric"
            maxLength={10}
            aria-invalid={Boolean(submitted && errors.nationalId)}
          />
        </Field>

        <Field
          label={t("common.phone")}
          error={submitted ? errors.phone : undefined}
        >
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder={t("employeesDash.phonePlaceholder")}
            inputMode="tel"
            aria-invalid={Boolean(submitted && errors.phone)}
          />
        </Field>

        <Field label={t("employeesDash.jobTitle")}>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <Field label={t("employeesDash.department")}>
          <Input
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
          />
        </Field>
      </div>

      {!isSelf && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          <span>{t("employeesDash.active")}</span>
        </label>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() =>
            router.push(ROUTES.DASHBOARD_EMPLOYEE_DETAIL(employeeId))
          }
        >
          {t("common.cancel")}
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? t("common.saving") : t("employeesDash.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
