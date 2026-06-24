"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  /** Shown when nothing is selected; also the label of the "clear" row. */
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Searchable single-select combobox with a fully styled, scrollable option
 * panel (native <select>/<datalist> menus can't be themed). RTL-aware,
 * keyboard navigable, closes on outside-click / Escape.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "بحث…",
  emptyText = "لا توجد نتائج",
  disabled,
  className,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const showSearch = options.length > 6;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      if (showSearch) requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, showSearch]);

  // Keep the highlighted row scrolled into view.
  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function commit(next: string) {
    onChange(next);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) commit(opt.value);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors",
          "hover:border-ring/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span
          className={cn(
            "truncate text-start",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          role="listbox"
        >
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          <ul ref={listRef} className="max-h-60 overflow-y-auto p-1.5">
            {/* Clear / "all" row */}
            <li>
              <button
                type="button"
                onClick={() => commit("")}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-muted",
                  !value && "font-semibold text-primary",
                )}
              >
                <span className="truncate">{placeholder}</span>
                {!value && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </li>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => commit(opt.value)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors",
                        i === active && "bg-muted",
                        isSelected
                          ? "font-semibold text-primary"
                          : "text-foreground",
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
