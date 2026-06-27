"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { t } from "@/lib/i18n";

const INVITATION_STATUS_LABELS: Record<
  "pending" | "accepted" | "expired" | "revoked",
  string
> = {
  pending: "statusPending",
  accepted: "statusAccepted",
  expired: "statusExpired",
  revoked: "statusRevoked",
};

function invitationStatusLabel(
  status: "pending" | "accepted" | "expired" | "revoked",
): string {
  return t(`employeesDash.${INVITATION_STATUS_LABELS[status]}`);
}

interface EmployeeRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissionGroupIds?: string[];
  title: string | null;
  department: string | null;
  phone: string | null;
  active: boolean;
  joinedAt: string | null;
  updatedAt: string | null;
}

interface InvitationRow {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string | null;
  createdAt: string | null;
}

interface PermissionGroupOption {
  id: string;
  nameEn: string;
  nameAr: string;
  active: boolean;
}

interface DashboardEmployeesClientProps {
  companyId: string;
  currentUserId: string;
  canManageEmployees: boolean;
  initialEmployees: EmployeeRow[];
  initialInvitations: InvitationRow[];
}

function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

function dateOrDash(value: string | null): string {
  if (!value) return "-";
  return formatDate(value);
}

export function DashboardEmployeesClient({
  companyId,
  currentUserId,
  canManageEmployees,
  initialEmployees,
  initialInvitations,
}: DashboardEmployeesClientProps) {
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees);
  const [invitations, setInvitations] =
    useState<InvitationRow[]>(initialInvitations);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [, setLoadingPermissionGroups] = useState(false);
  const [permissionGroups, setPermissionGroups] = useState<
    PermissionGroupOption[]
  >([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeEmployeesCount = useMemo(
    () => employees.filter((employee) => employee.active).length,
    [employees],
  );

  const pendingInvitesCount = useMemo(
    () => invitations.filter((invite) => invite.status === "pending").length,
    [invitations],
  );

  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/employees`, {
        method: "GET",
      });
      const payload = (await response.json()) as {
        employees?: EmployeeRow[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || t("employeesDash.loadEmployeesFailed"));
      }

      setEmployees(Array.isArray(payload.employees) ? payload.employees : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("employeesDash.loadEmployeesFailed"),
      );
    } finally {
      setLoadingEmployees(false);
    }
  }, [companyId]);

  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/invitations`, {
        method: "GET",
      });
      const payload = (await response.json()) as {
        invitations?: InvitationRow[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error || t("employeesDash.loadInvitationsFailed"),
        );
      }

      setInvitations(
        Array.isArray(payload.invitations) ? payload.invitations : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("employeesDash.loadInvitationsFailed"),
      );
    } finally {
      setLoadingInvitations(false);
    }
  }, [companyId]);

  const loadPermissionGroups = useCallback(async () => {
    setLoadingPermissionGroups(true);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/permission-groups`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const payload = (await response.json()) as {
        groups?: PermissionGroupOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || t("employeesDash.loadGroupsFailed"));
      }

      const activeGroups = Array.isArray(payload.groups)
        ? payload.groups.filter((group) => group.active !== false)
        : [];

      setPermissionGroups(activeGroups);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("employeesDash.loadGroupsFailed"),
      );
    } finally {
      setLoadingPermissionGroups(false);
    }
  }, [companyId]);

  const refreshData = useCallback(async () => {
    await Promise.all([
      loadEmployees(),
      loadInvitations(),
      loadPermissionGroups(),
    ]);
  }, [loadEmployees, loadInvitations, loadPermissionGroups]);

  const permissionGroupNameById = useMemo(() => {
    const entries = permissionGroups.map(
      (group) => [group.id, group.nameAr || group.nameEn || group.id] as const,
    );
    return new Map(entries);
  }, [permissionGroups]);

  useEffect(() => {
    void loadPermissionGroups();
  }, [loadPermissionGroups]);

  async function revokeInvitation(invitationId: string) {
    setBusyId(invitationId);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/invitations/${invitationId}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || t("employeesDash.revokeFailed"));
      }

      await loadInvitations();
      setNotice(t("employeesDash.invitationRevoked"));
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : t("employeesDash.revokeFailed"),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deactivateEmployee(employeeId: string) {
    setBusyId(employeeId);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/employees/${employeeId}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || t("employeesDash.deactivateFailed"));
      }

      await loadEmployees();
      setNotice(t("employeesDash.employeeDeactivated"));
    } catch (deactivateError) {
      setError(
        deactivateError instanceof Error
          ? deactivateError.message
          : t("employeesDash.deactivateFailed"),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("employeesDash.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("employeesDash.subtitle")}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshData}
            >
              {t("employeesDash.refresh")}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.DASHBOARD_EMPLOYEE_PERMISSIONS}>
                {t("employeesDash.permissionGroups")}
              </Link>
            </Button>
            {canManageEmployees && (
              <Button asChild size="sm">
                <Link href={ROUTES.DASHBOARD_EMPLOYEE_NEW}>
                  <Plus />
                  {t("employeesDash.addEmployee")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          label={t("employeesDash.totalEmployees")}
          value={String(employees.length)}
        />
        <MetricCard
          label={t("employeesDash.activeEmployees")}
          value={String(activeEmployeesCount)}
        />
        <MetricCard
          label={t("employeesDash.pendingInvites")}
          value={String(pendingInvitesCount)}
        />
      </section>

      {(error || notice) && (
        <section className="space-y-3">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {notice}
            </div>
          )}
        </section>
      )}


      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("employeesDash.colEmployee")}</th>
                <th className="px-4 py-3">{t("employeesDash.colPermission")}</th>
                <th className="px-4 py-3">{t("employeesDash.colTitle")}</th>
                <th className="px-4 py-3">{t("common.status")}</th>
                <th className="px-4 py-3">{t("employeesDash.colJoined")}</th>
                <th className="px-4 py-3">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(loadingEmployees || loadingInvitations) && (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={6}>
                    {t("employeesDash.loadingEmployees")}
                  </td>
                </tr>
              )}

              {!loadingEmployees && employees.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                    {t("employeesDash.noEmployees")}
                  </td>
                </tr>
              )}

              {employees.map((employee) => {
                const isBusy = busyId === employee.id;
                const canDeactivate =
                  canManageEmployees &&
                  employee.active &&
                  employee.id !== currentUserId;

                return (
                  <tr key={employee.id}>
                    <td className="px-4 py-4">
                      <Link
                        href={ROUTES.DASHBOARD_EMPLOYEE_DETAIL(employee.id)}
                        className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
                      >
                        {employee.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {employee.email}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {Array.isArray(employee.permissionGroupIds) &&
                      employee.permissionGroupIds.length > 0
                        ? employee.permissionGroupIds
                            .map(
                              (groupId) =>
                                permissionGroupNameById.get(groupId) || groupId,
                            )
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {employee.title || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-semibold",
                          employee.active
                            ? "bg-success/20 text-success"
                            : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {employee.active
                        ? t("employeesDash.active")
                        : t("employeesDash.inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {dateOrDash(employee.joinedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={ROUTES.DASHBOARD_EMPLOYEE_DETAIL(employee.id)}
                          className="rounded-md border border-border px-2 py-1 text-xs text-foreground transition hover:bg-muted"
                        >
                          {t("employeesDash.viewDetails")}
                        </Link>
                        {canDeactivate ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => deactivateEmployee(employee.id)}
                            className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {t("employeesDash.deactivate")}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">
            {t("employeesDash.invitations")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("common.email")}</th>
                <th className="px-4 py-3">{t("employeesDash.role")}</th>
                <th className="px-4 py-3">{t("common.status")}</th>
                <th className="px-4 py-3">{t("employeesDash.colExpires")}</th>
                <th className="px-4 py-3">{t("employeesDash.colCreated")}</th>
                <th className="px-4 py-3">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loadingInvitations && invitations.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                    {t("employeesDash.noInvitations")}
                  </td>
                </tr>
              )}

              {invitations.map((invitation) => {
                const isBusy = busyId === invitation.id;

                return (
                  <tr key={invitation.id}>
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">
                        {invitation.email}
                      </p>
                      {invitation.name && (
                        <p className="text-xs text-muted-foreground">
                          {invitation.name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {roleLabel(invitation.role)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-semibold",
                          invitation.status === "pending"
                            ? "bg-warning/20 text-warning-foreground"
                            : invitation.status === "accepted"
                              ? "bg-success/20 text-success"
                              : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {invitationStatusLabel(invitation.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {dateOrDash(invitation.expiresAt)}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {dateOrDash(invitation.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      {canManageEmployees && invitation.status === "pending" ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => revokeInvitation(invitation.id)}
                          className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {t("employeesDash.revoke")}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
