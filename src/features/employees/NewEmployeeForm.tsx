"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Accordion, AccordionSection } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  ROLES,
  type Role,
} from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  isValidSaudiPhone,
  normalizeSaudiPhone,
} from "@/lib/utils/validation";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";

interface PermissionGroupOption {
  id: string;
  nameEn: string;
  nameAr: string;
  active: boolean;
}

interface NewEmployeeFormProps {
  companyId: string;
}

type Tab = "direct" | "invite";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialDirect = {
  name: "",
  email: "",
  title: "",
  department: "",
  phone: "",
};

const initialInvite = {
  name: "",
  email: "",
  role: ASSIGNABLE_ROLES[0] ?? ROLES.VIEWER,
};

export function NewEmployeeForm({ companyId }: NewEmployeeFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("direct");

  const [direct, setDirect] = useState(initialDirect);
  const [invite, setInvite] = useState(initialInvite);
  const [groups, setGroups] = useState<PermissionGroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/permission-groups`,
        { method: "GET", cache: "no-store" },
      );
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
      setSelectedGroupId((prev) => prev || active[0]?.id || "");
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

  const groupOptions = useMemo(
    () => [
      { value: "", label: t("employeesDash.selectPermissionGroup") },
      ...groups.map((g) => ({
        value: g.id,
        label: g.nameAr || g.nameEn || g.id,
      })),
    ],
    [groups],
  );

  const directErrors = useMemo(() => {
    const e: { name?: string; email?: string; group?: string; phone?: string } =
      {};
    if (direct.name.trim().length < 2) e.name = t("common.fieldRequired");
    if (!direct.email.trim() || !EMAIL_RE.test(direct.email.trim())) {
      e.email = !direct.email.trim()
        ? t("common.fieldRequired")
        : t("common.invalidEmail");
    }
    if (!selectedGroupId) e.group = t("common.fieldRequired");
    if (direct.phone.trim() && !isValidSaudiPhone(direct.phone)) {
      e.phone = t("common.invalidPhone");
    }
    return e;
  }, [direct, selectedGroupId]);

  const inviteErrors = useMemo(() => {
    const e: { email?: string } = {};
    if (!invite.email.trim() || !EMAIL_RE.test(invite.email.trim())) {
      e.email = !invite.email.trim()
        ? t("common.fieldRequired")
        : t("common.invalidEmail");
    }
    return e;
  }, [invite]);

  const directStatus = useMemo(() => {
    if (submitted && tab === "direct" && Object.keys(directErrors).length > 0) {
      return "error" as const;
    }
    if (Object.keys(directErrors).length === 0) return "complete" as const;
    return "neutral" as const;
  }, [submitted, tab, directErrors]);

  const inviteStatus = useMemo(() => {
    if (submitted && tab === "invite" && Object.keys(inviteErrors).length > 0) {
      return "error" as const;
    }
    if (Object.keys(inviteErrors).length === 0) return "complete" as const;
    return "neutral" as const;
  }, [submitted, tab, inviteErrors]);

  async function createEmployee() {
    setSubmitted(true);
    if (Object.keys(directErrors).length > 0) {
      setError(t("common.fixErrors"));
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/companies/${companyId}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: direct.name.trim(),
          email: direct.email.trim(),
          role: ROLES.VIEWER,
          title: direct.title.trim() || undefined,
          department: direct.department.trim() || undefined,
          phone: direct.phone.trim()
            ? normalizeSaudiPhone(direct.phone)
            : undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        authUserCreated?: boolean;
        temporaryPassword?: string;
        passwordResetLink?: string;
        employee?: { id?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error || t("employeesDash.createFailed"));
      }

      let groupAssignmentError: string | null = null;
      const createdEmployeeId = payload.employee?.id;
      if (createdEmployeeId) {
        const assignResponse = await fetch(
          `/api/companies/${companyId}/employees/${createdEmployeeId}/permission-groups`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ permissionGroupIds: [selectedGroupId] }),
          },
        );
        const assignPayload = (await assignResponse.json()) as {
          error?: string;
        };
        if (!assignResponse.ok) {
          groupAssignmentError =
            assignPayload.error || t("employeesDash.groupAssignFailed");
        }
      } else {
        groupAssignmentError = t("employeesDash.groupAssignFailed");
      }

      const parts = [t("employeesDash.employeeCreated")];
      if (payload.authUserCreated) parts.push(t("employeesDash.authAccountCreated"));
      if (payload.temporaryPassword) {
        parts.push(
          t("employeesDash.tempPassword", { value: payload.temporaryPassword }),
        );
      }
      if (payload.passwordResetLink) {
        parts.push(
          t("employeesDash.passwordResetLink", {
            value: payload.passwordResetLink,
          }),
        );
      }
      if (!groupAssignmentError) parts.push(t("employeesDash.groupsAssigned"));
      else parts.push(groupAssignmentError);

      setNotice(parts.join(" "));
      setDirect(initialDirect);
      setSubmitted(false);
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("employeesDash.createFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function sendInvitation() {
    setSubmitted(true);
    if (Object.keys(inviteErrors).length > 0) {
      setError(t("common.fixErrors"));
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/companies/${companyId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: invite.name.trim() || undefined,
          email: invite.email.trim(),
          role: invite.role,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        suggestedLoginUrl?: string;
        passwordResetLink?: string;
        acceptApiUrl?: string;
        invitationEmailSent?: boolean;
        invitationEmailSkipped?: boolean;
        invitationEmailReason?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.error || t("employeesDash.inviteCreateFailed"));
      }

      const parts = [t("employeesDash.inviteCreated")];
      if (payload.invitationEmailSent) parts.push(t("employeesDash.inviteEmailSent"));
      else if (payload.invitationEmailSkipped)
        parts.push(t("employeesDash.inviteEmailSkipped"));
      else {
        parts.push(t("employeesDash.inviteEmailFailed"));
        if (payload.invitationEmailReason) {
          parts.push(
            t("employeesDash.emailError", {
              value: payload.invitationEmailReason,
            }),
          );
        }
      }
      if (payload.passwordResetLink) {
        parts.push(
          t("employeesDash.passwordResetLink", {
            value: payload.passwordResetLink,
          }),
        );
      }
      if (payload.suggestedLoginUrl) {
        parts.push(
          t("employeesDash.loginUrl", { value: payload.suggestedLoginUrl }),
        );
      }
      if (payload.acceptApiUrl) {
        parts.push(
          t("employeesDash.acceptApiUrl", { value: payload.acceptApiUrl }),
        );
      }

      setNotice(parts.join(" "));
      setInvite(initialInvite);
      setSubmitted(false);
      router.refresh();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : t("employeesDash.inviteCreateFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function switchTab(next: Tab) {
    setTab(next);
    setSubmitted(false);
    setError(null);
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="space-y-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          <p className="whitespace-pre-wrap break-words">{notice}</p>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push(ROUTES.DASHBOARD_EMPLOYEES)}
          >
            {t("employeesDash.backToList")}
          </Button>
        </div>
      )}

      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        {(["direct", "invite"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchTab(value)}
            className={cn(
              "cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "direct"
              ? t("employeesDash.tabDirect")
              : t("employeesDash.tabInvite")}
          </button>
        ))}
      </div>

      {tab === "direct" ? (
        <Accordion>
          <AccordionSection
            title={t("employeesDash.directInfo")}
            description={t("employeesDash.directInfoHint")}
            status={directStatus}
            defaultOpen
          >
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <Field
                label={t("employeesDash.fullName")}
                required
                error={submitted ? directErrors.name : undefined}
              >
                <Input
                  value={direct.name}
                  onChange={(e) =>
                    setDirect((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder={t("employeesDash.employeeNamePlaceholder")}
                  aria-invalid={Boolean(submitted && directErrors.name)}
                />
              </Field>
              <Field
                label={t("common.email")}
                required
                error={submitted ? directErrors.email : undefined}
              >
                <Input
                  type="email"
                  value={direct.email}
                  onChange={(e) =>
                    setDirect((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder={t("employeesDash.employeeEmailPlaceholder")}
                  aria-invalid={Boolean(submitted && directErrors.email)}
                />
              </Field>
              <Field
                label={t("employeesDash.permissionGroup")}
                required
                error={submitted ? directErrors.group : undefined}
                hint={
                  loadingGroups
                    ? t("employeesDash.loadingPermissionGroups")
                    : undefined
                }
              >
                <Select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  {groupOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </AccordionSection>

          <AccordionSection
            title={t("common.optionalDetails")}
            description={t("common.optionalDetailsHint")}
          >
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <Field label={t("employeesDash.jobTitle")}>
                <Input
                  value={direct.title}
                  onChange={(e) =>
                    setDirect((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder={t("employeesDash.jobTitlePlaceholder")}
                />
              </Field>
              <Field label={t("employeesDash.department")}>
                <Input
                  value={direct.department}
                  onChange={(e) =>
                    setDirect((p) => ({ ...p, department: e.target.value }))
                  }
                  placeholder={t("employeesDash.departmentPlaceholder")}
                />
              </Field>
              <Field
                label={t("common.phone")}
                error={submitted ? directErrors.phone : undefined}
              >
                <Input
                  value={direct.phone}
                  onChange={(e) =>
                    setDirect((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder={t("employeesDash.phonePlaceholder")}
                  inputMode="tel"
                  aria-invalid={Boolean(submitted && directErrors.phone)}
                />
              </Field>
            </div>
          </AccordionSection>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push(ROUTES.DASHBOARD_EMPLOYEES)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={createEmployee}
              disabled={submitting || loadingGroups || groups.length === 0}
            >
              {submitting ? t("common.saving") : t("employeesDash.createEmployee")}
            </Button>
          </div>
        </Accordion>
      ) : (
        <Accordion>
          <AccordionSection
            title={t("employeesDash.inviteInfo")}
            description={t("employeesDash.inviteInfoHint")}
            status={inviteStatus}
            defaultOpen
          >
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <Field
                label={t("common.email")}
                required
                error={submitted ? inviteErrors.email : undefined}
              >
                <Input
                  type="email"
                  value={invite.email}
                  onChange={(e) =>
                    setInvite((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder={t("employeesDash.employeeEmailPlaceholder")}
                  aria-invalid={Boolean(submitted && inviteErrors.email)}
                />
              </Field>
              <Field label={t("employeesDash.role")} required>
                <Select
                  value={invite.role}
                  onChange={(e) =>
                    setInvite((p) => ({ ...p, role: e.target.value as Role }))
                  }
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role] ?? role}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </AccordionSection>

          <AccordionSection
            title={t("common.optionalDetails")}
            description={t("common.optionalDetailsHint")}
          >
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <Field label={t("employeesDash.nameOptional")}>
                <Input
                  value={invite.name}
                  onChange={(e) =>
                    setInvite((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder={t("employeesDash.inviteeNamePlaceholder")}
                />
              </Field>
            </div>
          </AccordionSection>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push(ROUTES.DASHBOARD_EMPLOYEES)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={sendInvitation}
              disabled={submitting}
            >
              {submitting ? t("common.saving") : t("employeesDash.sendInvitation")}
            </Button>
          </div>
        </Accordion>
      )}
    </div>
  );
}
