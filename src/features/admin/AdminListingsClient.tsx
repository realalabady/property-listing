"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LISTING_STATUS_LABELS } from "@/constants/listing-categories";
import { t } from "@/lib/i18n";
import type { AdminListingRow } from "@/app/(admin)/admin/listings/page";

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
    LISTING_STATUS_LABELS[status as keyof typeof LISTING_STATUS_LABELS]?.ar ??
    status
  );
}

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return "-";
  return `${price.toLocaleString("en-US")} ${currency}`;
}

export function AdminListingsClient({
  listings,
}: {
  listings: AdminListingRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deleteListing = async (row: AdminListingRow) => {
    if (!window.confirm(t("admin.confirmDeleteListing"))) return;

    setBusyId(row.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/listings/${row.companyId}/${row.id}`,
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
        {t("admin.totalCount", { count: listings.length })}
      </p>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("admin.colTitle")}</th>
                <th className="px-4 py-3">{t("admin.colCompany")}</th>
                <th className="px-4 py-3">{t("admin.colStatus")}</th>
                <th className="px-4 py-3">{t("admin.colPrice")}</th>
                <th className="px-4 py-3">{t("admin.colCreatedAt")}</th>
                <th className="px-4 py-3">{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("admin.noListings")}
                  </td>
                </tr>
              ) : (
                listings.map((row) => (
                  <tr key={`${row.companyId}-${row.id}`}>
                    <td className="px-4 py-4 font-medium text-foreground">
                      {row.title}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.companyName}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {statusLabel(row.status)}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatPrice(row.price, row.currency)}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => deleteListing(row)}
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
