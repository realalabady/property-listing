"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface CountdownTimerProps {
  /** Target end time as epoch milliseconds. */
  endsAt: number;
  size?: "sm" | "md";
  className?: string;
  /** Text shown once the end time has passed. */
  endedLabel?: string;
}

const UNITS: { label: string; short: string }[] = [
  { label: "يوم", short: "ي" },
  { label: "ساعة", short: "س" },
  { label: "دقيقة", short: "د" },
  { label: "ثانية", short: "ث" },
];

/** Break remaining ms into [days, hours, minutes, seconds]. */
function segments(msLeft: number): number[] {
  let total = Math.max(0, Math.floor(msLeft / 1000));
  const d = Math.floor(total / 86400);
  total %= 86400;
  const h = Math.floor(total / 3600);
  total %= 3600;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return [d, h, m, s];
}

/**
 * Live countdown to `endsAt`, rendered as discrete unit boxes so the digits
 * stay direction-neutral (the earlier single-string version reordered under
 * RTL). Days sit on the right, seconds on the left — natural Arabic order.
 * Ticks every second; shows `endedLabel` once the moment passes.
 */
export function CountdownTimer({
  endsAt,
  size = "md",
  className,
  endedLabel = "انتهت المزايدة",
}: CountdownTimerProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msLeft = endsAt - now;
  if (msLeft <= 0) {
    return (
      <span className={cn("font-semibold", className)}>{endedLabel}</span>
    );
  }

  const parts = segments(msLeft);
  // Drop the days box once there are no full days left, keeping h/m/s.
  const startIdx = parts[0] === 0 ? 1 : 0;

  const box =
    size === "sm"
      ? "min-w-[2.25rem] rounded-md px-1.5 py-1"
      : "min-w-[3rem] rounded-lg px-2 py-1.5";
  const numCls = size === "sm" ? "text-sm font-bold" : "text-xl font-bold";
  const lblCls =
    size === "sm" ? "text-[9px] leading-none" : "text-[10px] leading-none";

  return (
    <span
      dir="ltr"
      className={cn("inline-flex flex-row-reverse items-stretch gap-1.5", className)}
    >
      {UNITS.map((unit, i) => {
        if (i < startIdx) return null;
        const value = parts[i];
        return (
          <span
            key={unit.label}
            className={cn(
              "flex flex-col items-center justify-center bg-white/70 text-amber-900 tabular-nums dark:bg-black/25 dark:text-amber-100",
              box,
            )}
          >
            <span className={numCls}>
              {i === startIdx ? value : String(value).padStart(2, "0")}
            </span>
            <span className={cn("text-amber-700/80 dark:text-amber-300/80", lblCls)}>
              {size === "sm" ? unit.short : unit.label}
            </span>
          </span>
        );
      })}
    </span>
  );
}
