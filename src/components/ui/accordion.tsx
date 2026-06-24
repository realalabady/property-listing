"use client";

import * as React from "react";
import { ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type AccordionStatus = "neutral" | "complete" | "error";

interface AccordionSectionProps {
  title: string;
  description?: string;
  /** Drives the trailing status indicator (green check / red warning). */
  status?: AccordionStatus;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  /** Controlled open state (pair with onOpenChange). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * RTL-friendly accordion section. Native button header (never submits a form),
 * smooth grid-rows expand/collapse, and an optional status indicator used to
 * mark required sections complete (green) or in error (red).
 */
function AccordionSection({
  title,
  description,
  status = "neutral",
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  id,
  children,
  className,
}: AccordionSectionProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;

  const reactId = React.useId();
  const panelId = id ? `${id}-panel` : `acc-${reactId}-panel`;

  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        status === "error" && "border-destructive/50",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-start transition-colors hover:bg-muted/40"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {status === "complete" && (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
          )}
          {status === "error" && (
            <AlertCircle
              className="h-5 w-5 shrink-0 text-destructive"
              aria-hidden
            />
          )}
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-foreground">
              {title}
            </span>
            {description && (
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                {description}
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-all duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-5 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Accordion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

export { Accordion, AccordionSection };
