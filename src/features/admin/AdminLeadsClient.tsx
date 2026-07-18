"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUS_LABELS } from "@/constants/listing-categories";
import { t } from "@/lib/i18n";
import type { AdminLeadRow } from "@/app/(admin)/admin/leads/page";

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

function statusLabel(status: string): string {
  return (
    LEAD_STATUS_LABELS[status as keyof typeof LEAD_STATUS_LABELS]?.ar ?? status
  );
}

export function AdminLeadsClient({ leads }: { leads: AdminLeadRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deleteLead = async (row: AdminLeadRow) => {
    if (!window.confirm(t("admin.confirmDeleteLead"))) return;

    setBusyId(row.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/leads/${row.companyId}/${row.id}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || t("admin.deleteFailed"));
      }
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("admin.deleteFailed"),
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

      <p className="text-sm text-muted-foreground">
        {t("admin.totalCount", { count: leads.length })}
      </p>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("admin.colName")}</th>
                <th className="px-4 py-3">{t("admin.colCompany")}</th>
                <th className="px-4 py-3">{t("admin.colPhone")}</th>
                <th className="px-4 py-3">{t("admin.colSource")}</th>
                <th className="px-4 py-3">{t("admin.colStatus")}</th>
                <th className="px-4 py-3">{t("admin.colAssigned")}</th>
                <th className="px-4 py-3">{t("admin.colCreatedAt")}</th>
                <th className="px-4 py-3">{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("admin.noLeads")}
                  </td>
                </tr>
              ) : (
                leads.map((row) => (
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
                      {row.source}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {statusLabel(row.status)}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.assignedToName}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => deleteLead(row)}
                        className="rounded-md border border-destructive/40 px-2 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                      >
                        {busyId === row.id
                          ? t("admin.deleting")
                          : t("admin.delete")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
