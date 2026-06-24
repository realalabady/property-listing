"use client";

import { memo } from "react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxOption {
  id: string;
  label: string;
  checked: boolean;
}

interface CheckboxGroupProps {
  options: CheckboxOption[];
  onToggle: (id: string, nextChecked: boolean) => void;
  className?: string;
}

function CheckboxGroupComponent({
  options,
  onToggle,
  className,
}: CheckboxGroupProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {options.map((option) => (
        <label
          key={option.id}
          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/40"
        >
          <input
            type="checkbox"
            checked={option.checked}
            onChange={(event) => onToggle(option.id, event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <span className="flex-1 text-right text-sm text-foreground">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export const CheckboxGroup = memo(CheckboxGroupComponent);
