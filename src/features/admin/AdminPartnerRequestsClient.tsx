"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { t } from "@/lib/i18n";
import { Pagination } from "@/components/ui/pagination";
import type { AdminPartnerRequestRow } from "@/app/(admin)/admin/partner-requests/page";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  approved: "مقبول",
  rejected: "مرفوض",
};

const STATUS_CLASSES: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  contacted: "bg-secondary text-secondary-foreground",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

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

/**
 * Prefills the create-company form with the applicant's details so the admin
 * turns an approved application into a company without retyping anything.
 */
function createCompanyHref(row: AdminPartnerRequestRow): string {
  const params = new URLSearchParams({
    name: row.companyName,
    email: row.email,
    cr: row.commercialRegistrationNumber,
    ...(row.phone ? { phone: row.phone } : {}),
    ...(row.message ? { description: row.message } : {}),
    partnerRequestId: row.id,
  });
  return `${ROUTES.ADMIN_COMPANY_NEW}?${params.toString()}`;
}

export function AdminPartnerRequestsClient({
  requests,
}: {
  requests: AdminPartnerRequestRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((row) =>
      [
        row.companyName,
        row.contactName,
        row.commercialRegistrationNumber,
        row.email,
        row.phone,
        row.city,
        row.hearAbout,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [requests, search]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setStatus = async (row: AdminPartnerRequestRow, status: string) => {
    setBusyId(row.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/partner-requests/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
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
          placeholder="ابحث باسم الشركة أو السجل التجاري أو البريد…"
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
                <th className="px-4 py-3">{t("admin.colCompany")}</th>
                <th className="px-4 py-3">{t("admin.colContactPerson")}</th>
                <th className="px-4 py-3">{t("admin.colCommercialReg")}</th>
                <th className="px-4 py-3">{t("admin.colPhone")}</th>
                <th className="px-4 py-3">{t("admin.colHearAbout")}</th>
                <th className="px-4 py-3">{t("admin.colStatus")}</th>
                <th className="px-4 py-3">{t("admin.colCreatedAt")}</th>
                <th className="px-4 py-3">{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("admin.noPartnerRequests")}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">
                        {row.companyName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.email}
                      </p>
                      {row.city && (
                        <p className="text-xs text-muted-foreground">
                          {row.city}
                        </p>
                      )}
                      {row.message && (
                        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                          {row.message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.contactName}
                    </td>
                    <td className="px-4 py-4 font-mono text-muted-foreground">
                      {row.commercialRegistrationNumber}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.phone || "-"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.hearAbout || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-medium ${
                          STATUS_CLASSES[row.status] ??
                          "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={createCompanyHref(row)}
                          className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                        >
                          {t("admin.createCompany")}
                        </Link>
                        {row.status !== "contacted" && (
                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() => setStatus(row, "contacted")}
                            className="rounded-md border border-border px-2 py-1 text-xs font-semibold transition hover:bg-secondary disabled:opacity-60"
                          >
                            {t("admin.markContacted")}
                          </button>
                        )}
                        {row.status !== "rejected" && (
                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() => setStatus(row, "rejected")}
                            className="rounded-md border border-destructive/40 px-2 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                          >
                            {t("admin.reject")}
                          </button>
                        )}
                      </div>
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
