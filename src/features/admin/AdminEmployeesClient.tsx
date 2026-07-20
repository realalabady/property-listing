"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, isValidRole, type Role } from "@/constants/roles";
import { t } from "@/lib/i18n";
import type { AdminEmployeeRow } from "@/app/(admin)/admin/employees/page";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ar-SA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role: string): string {
  return isValidRole(role) ? ROLE_LABELS[role as Role] : role;
}

export function AdminEmployeesClient({
  employees,
}: {
  employees: AdminEmployeeRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((row) =>
      [row.name, row.email, row.phone, row.companyName, roleLabel(row.role)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [employees, search]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleActive = async (row: AdminEmployeeRow) => {
    const nextActive = !row.active;
    if (
      !window.confirm(
        nextActive
          ? t("admin.confirmActivateEmployee")
          : t("admin.confirmDeactivateEmployee"),
      )
    ) {
      return;
    }

    setBusyId(row.id);
    setError(null);
    try {
      // Reuse the company employee route — super admins are authorized there,
      // and it also syncs/clears the user's auth claims.
      const response = await fetch(
        `/api/companies/${row.companyId}/employees/${row.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: nextActive }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || t("admin.updateFailed"));
      }
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : t("admin.updateFailed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="ابحث بالاسم أو البريد أو الشركة أو الدور…"
          className="h-11 w-full max-w-sm rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
        />
        <p className="text-sm text-muted-foreground">
          {t("admin.totalCount", { count: filtered.length })}
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("admin.colName")}</th>
                <th className="px-4 py-3">{t("admin.colCompany")}</th>
                <th className="px-4 py-3">{t("admin.colPhone")}</th>
                <th className="px-4 py-3">{t("admin.colRole")}</th>
                <th className="px-4 py-3">{t("admin.colStatus")}</th>
                <th className="px-4 py-3">{t("admin.colLastSignIn")}</th>
                <th className="px-4 py-3">{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("admin.noEmployees")}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={`${row.companyId}-${row.id}`}>
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.email}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.companyName}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.phone}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {roleLabel(row.role)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.active
                            ? "bg-success/20 text-success"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {row.active
                          ? t("admin.activeBadge")
                          : t("admin.inactiveBadge")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(row.lastSignInAt)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => toggleActive(row)}
                        className={`rounded-md border px-2 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                          row.active
                            ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                            : "border-success/40 text-success hover:bg-success/10"
                        }`}
                      >
                        {busyId === row.id
                          ? t("common.saving")
                          : row.active
                            ? t("admin.deactivate")
                            : t("admin.activate")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}
