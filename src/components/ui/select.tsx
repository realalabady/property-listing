import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Enterprise native select with a trailing chevron. Native <select> keeps
 * keyboard/mobile behaviour and RTL alignment for free.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-11 w-full appearance-none rounded-lg border border-input bg-card px-3.5 pe-10 text-sm text-foreground",
          "outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4 text-muted-foreground"
      />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
