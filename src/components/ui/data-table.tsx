import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface Column<T> {
  /** Stable key, also used for the React key of the cell. */
  key: string;
  header: React.ReactNode;
  /** Cell renderer for a given row. */
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Shown while loading (before any rows arrive). */
  loading?: boolean;
  loadingLabel?: string;
  /** Shown when there are no rows and not loading. */
  emptyLabel?: React.ReactNode;
  className?: string;
}

/**
 * Readability-first enterprise table: light gray bold header, horizontal row
 * separators, generous row height, and a hover state. RTL-aware (text-start).
 */
function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  loadingLabel = "Loading…",
  emptyLabel = "No data",
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-start">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  {loadingLabel}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-10 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="transition-colors hover:bg-muted/40"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3.5 align-middle text-foreground",
                        col.className,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { DataTable };
