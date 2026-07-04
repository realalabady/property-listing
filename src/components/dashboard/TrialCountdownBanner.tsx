"use client";

import { useEffect, useState } from "react";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

interface Segments {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function toSegments(ms: number): Segments {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Live trial reminder shown to company members only in the final 3 days of the
 * trial (and once it has lapsed). Ticks every second. Renders nothing until
 * mounted to avoid a server/client hydration mismatch on the clock. Uses the
 * destructive (red) tone to signal that action is required.
 */
export function TrialCountdownBanner({ trialEndsAt }: { trialEndsAt: string }) {
  const end = new Date(trialEndsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null || Number.isNaN(end)) return null;

  const remaining = end - now;
  if (remaining > THREE_DAYS_MS) return null;

  const expired = remaining <= 0;

  if (expired) {
    return (
      <div className="mb-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3.5">
        <p className="text-sm font-semibold text-destructive">
          انتهت فترتك التجريبية
        </p>
        <p className="text-xs text-destructive/80">
          تواصل معنا لتفعيل اشتراكك ومتابعة العمل دون انقطاع.
        </p>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = toSegments(remaining);
  const segments: Array<{ value: number; label: string }> = [
    { value: days, label: "يوم" },
    { value: hours, label: "ساعة" },
    { value: minutes, label: "دقيقة" },
    { value: seconds, label: "ثانية" },
  ];

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-destructive">
          فترتك التجريبية تنتهي قريبًا
        </p>
        <p className="text-xs text-destructive/80">
          جدّد اشتراكك للاستمرار في استخدام راعي دون انقطاع.
        </p>
      </div>

      <div className="flex items-center gap-1.5" dir="ltr">
        {segments.map((segment, index) => (
          <div key={segment.label} className="flex items-center gap-1.5">
            <div className="flex min-w-11 flex-col items-center rounded-lg border border-destructive/30 bg-background px-2 py-1">
              <span className="font-mono text-base font-bold leading-none tabular-nums text-destructive">
                {String(segment.value).padStart(2, "0")}
              </span>
              <span className="mt-0.5 text-[10px] leading-none text-destructive/70">
                {segment.label}
              </span>
            </div>
            {index < segments.length - 1 && (
              <span className="text-sm font-bold text-destructive/40">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
