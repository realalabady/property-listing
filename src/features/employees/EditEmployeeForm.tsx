"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ROLES, type Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  isValidNationalId,
  isValidSaudiPhone,
  normalizeSaudiPhone,
} from "@/lib/utils/validation";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";

export interface EditEmployeeInitial {
  name: string;
  role: Role;
  phone: string;
  nationalId: string;
  title: string;
  department: string;
  active: boolean;
  permissionGroupIds: string[];
}

interface PermissionGroupOption {
  id: string;
  nameEn: string;
  nameAr: string;
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
  const [groups, setGroups] = useState<PermissionGroupOption[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set(initial.permissionGroupIds),
  );
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/permission-groups`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await res.json()) as {
        groups?: PermissionGroupOption[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error || t("employeesDash.loadGroupsFailed"));
      }
      const active = Array.isArray(payload.groups)
        ? payload.groups.filter((g) => g.active !== false)
        : [];
      setGroups(active);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("employeesDash.loadGroupsFailed"),
      );
    } finally {
      setLoadingGroups(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

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

  function toggleGroup(groupId: string, checked: boolean) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
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
      // Permissions come from the assigned groups, not a preset role. Normalize
      // the role to the minimal `viewer` base so the selected groups are the
      // sole source of permissions — matching the add-employee flow. The
      // company owner and the editor's own account keep their role to avoid
      // locking management access out of the company.
      const preserveRole = isSelf || initial.role === ROLES.COMPANY_OWNER;

      const res = await fetch(
        `/api/companies/${companyId}/employees/${employeeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            ...(preserveRole ? {} : { role: ROLES.VIEWER }),
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

      const groupRes = await fetch(
        `/api/companies/${companyId}/employees/${employeeId}/permission-groups`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissionGroupIds: Array.from(selectedGroupIds),
          }),
        },
      );
      const groupPayload = (await groupRes.json()) as { error?: string };
      if (!groupRes.ok) {
        throw new Error(
          groupPayload.error || t("employeesDash.groupAssignFailed"),
        );
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

      {/* Permission groups replace the old preset-role dropdown: an employee's
          access is exactly the union of the groups selected here. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">
            {t("employeesDash.permissionGroups")}
          </span>
          <Link
            href={ROUTES.DASHBOARD_EMPLOYEE_PERMISSIONS}
            className="text-xs text-primary hover:underline"
          >
            {t("employeesDash.manageGroupsLink")}
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("employeesDash.assignGroupsHint")}
        </p>

        {loadingGroups ? (
          <p className="text-sm text-muted-foreground">
            {t("employeesDash.loadingPermissionGroups")}
          </p>
        ) : groups.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {t("employeesDash.noGroupsYetHint")}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((group) => {
              const checked = selectedGroupIds.has(group.id);
              return (
                <label
                  key={group.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition",
                    checked
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/70 bg-background/70 hover:border-primary/40",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleGroup(group.id, e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex-1 text-sm">
                    {group.nameAr || group.nameEn || group.id}
                    {group.nameEn && group.nameAr && (
                      <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                        ({group.nameEn})
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
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
        <Button type="button" onClick={save} disabled={saving || loadingGroups}>
          {saving ? t("common.saving") : t("employeesDash.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
