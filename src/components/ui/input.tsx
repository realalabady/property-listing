import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Enterprise text input: white surface, thin border, 44px height,
 * blue focus ring with a soft shadow. Pairs with <Field>.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground",
        "placeholder:text-muted-foreground/70 outline-none transition",
        "focus:border-primary focus:ring-4 focus:ring-primary/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:ring-destructive/15",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
