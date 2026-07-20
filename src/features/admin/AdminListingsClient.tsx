"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LISTING_STATUS_LABELS } from "@/constants/listing-categories";
import { t } from "@/lib/i18n";
import type { AdminListingRow } from "@/app/(admin)/admin/listings/page";
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((row) =>
      [row.title, row.companyName, statusLabel(row.status)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [listings, search]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="ابحث بعنوان العقار أو الشركة أو الحالة…"
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
                <th className="px-4 py-3">{t("admin.colTitle")}</th>
                <th className="px-4 py-3">{t("admin.colCompany")}</th>
                <th className="px-4 py-3">{t("admin.colStatus")}</th>
                <th className="px-4 py-3">{t("admin.colPrice")}</th>
                <th className="px-4 py-3">{t("admin.colCreatedAt")}</th>
                <th className="px-4 py-3">{t("admin.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("admin.noListings")}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
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
