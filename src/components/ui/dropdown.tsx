"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface DropdownProps {
  /** The element that toggles the menu (rendered as the trigger button). */
  trigger: React.ReactNode;
  children: React.ReactNode;
  /** Menu alignment relative to the trigger. RTL-aware via logical props. */
  align?: "start" | "end";
  className?: string;
  contentClassName?: string;
}

/**
 * Click-to-open menu with outside-click + Escape dismissal. Compose menu rows
 * with <DropdownItem>. Used for header account controls and row actions.
 */
function Dropdown({
  trigger,
  children,
  align = "end",
  className,
  contentClassName,
}: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="cursor-pointer"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-40 min-w-48 rounded-xl border border-border bg-card p-1.5 shadow-lg",
            align === "end" ? "end-0" : "start-0",
            contentClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

function DropdownItem({
  className,
  destructive,
  ...props
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium transition-colors",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Dropdown, DropdownItem };
