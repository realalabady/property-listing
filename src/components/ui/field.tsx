import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control wrapper. Clear label above the input, optional hint and
 * inline error message below — the consistent form row across the app.
 */
function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-muted-foreground"
      >
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Groups related fields under a titled, separated block. Use multiple
 * sections to break long forms into logical chunks (progressive disclosure).
 */
function FormSection({
  title,
  description,
  className,
  children,
}: FormSectionProps) {
  return (
    <section
      className={cn("border-t border-border pt-6 first:border-t-0 first:pt-0", className)}
    >
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export { Field, FormSection };
