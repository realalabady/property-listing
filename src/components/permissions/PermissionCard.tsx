"use client";

import { memo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckboxGroup,
  type CheckboxOption,
} from "@/components/permissions/CheckboxGroup";

interface PermissionCardProps {
  title: string;
  checked: boolean;
  indeterminate: boolean;
  options: CheckboxOption[];
  onToggleCard: (nextChecked: boolean) => void;
  onToggleOption: (id: string, nextChecked: boolean) => void;
}

function PermissionCardComponent({
  title,
  checked,
  indeterminate,
  options,
  onToggleCard,
  onToggleOption,
}: PermissionCardProps) {
  const parentRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!parentRef.current) return;
    parentRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3">
          <input
            ref={parentRef}
            type="checkbox"
            checked={checked}
            onChange={(event) => onToggleCard(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <CardTitle className="text-base text-right">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CheckboxGroup options={options} onToggle={onToggleOption} />
      </CardContent>
    </Card>
  );
}

export const PermissionCard = memo(PermissionCardComponent);
