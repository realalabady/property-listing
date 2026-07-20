"use client";

import { t } from "@/lib/i18n";

interface PaginationProps {
  /** 1-based current page. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Compact, RTL-aware table pager. Renders nothing when everything fits on one
 * page. Styled with the app's own enterprise tokens (primary/border/card).
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const current = Math.min(Math.max(page, 1), pageCount);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  const btn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">
        {t("common.paginationRange", { from, to, total })}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={btn}
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
        >
          {t("common.previous")}
        </button>
        <span className="px-2 text-sm font-medium text-muted-foreground">
          {t("common.paginationPage", { page: current, pages: pageCount })}
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => onPageChange(current + 1)}
          disabled={current >= pageCount}
        >
          {t("common.next")}
        </button>
      </div>
    </div>
  );
}
