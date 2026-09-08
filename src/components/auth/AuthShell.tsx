"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { RaeiLogo } from "@/components/brand/RaeiLogo";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";

/**
 * Shared chrome for /login, /signup and /reset-password.
 *
 * Two panels: a saturated brand gradient carrying the value copy, and a light
 * panel holding the form. The colour lives in the brand panel so the form side
 * can stay high-contrast and calm — putting colour behind the inputs is what
 * makes auth screens hard to read.
 *
 * The brand panel is also the trust signal an account-security page needs: it
 * is the thing a lookalike page cannot cheaply reproduce.
 */

interface AuthShellProps {
  title: string;
  subtitle?: string;
  /** Value copy shown on the brand panel (desktop only). */
  aside?: {
    heading: string;
    points: string[];
  };
  /** Rendered under the card, e.g. "already have an account?". */
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  aside,
  footer,
  className,
  children,
}: AuthShellProps) {
  return (
    <main
      className={cn(
        "raei-light min-h-screen bg-background text-foreground",
        // Only split when there is a brand panel to fill the other track,
        // otherwise the form would sit in a half-width column off-centre.
        aside && "lg:grid lg:grid-cols-[1.05fr_1fr]",
      )}
    >
      {/* ---------------- Brand panel ---------------- */}
      {aside && (
        <aside className="relative hidden overflow-hidden bg-[hsl(274_55%_26%)] px-12 py-14 lg:flex lg:flex-col lg:justify-between">
          {/* Layered washes: violet lift, teal glow, blue floor. Keeping them
              low-opacity means the white copy above stays well past 4.5:1. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: [
                "radial-gradient(120% 90% at 85% 0%, hsl(274 60% 45% / 0.95), transparent 60%)",
                "radial-gradient(90% 70% at 10% 100%, hsl(176 100% 33% / 0.35), transparent 65%)",
                "radial-gradient(70% 60% at 0% 20%, hsl(204 100% 37% / 0.30), transparent 70%)",
              ].join(","),
            }}
          />
          {/* Fine grid, so the panel reads as a designed surface, not a blob. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />

          <div className="relative">
            <Link
              href={ROUTES.HOME}
              className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(274_55%_26%)]"
              aria-label="راعي"
            >
              <RaeiLogo size="md" onBrand />
            </Link>
          </div>

          <div className="relative">
            <h2 className="max-w-lg text-[2.6rem] font-extrabold leading-[1.15] tracking-tight text-white">
              {aside.heading}
            </h2>
            <ul className="mt-9 space-y-5">
              {aside.points.map((point) => (
                <li key={point} className="flex items-start gap-3.5">
                  <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(176_75%_45%)]/20 text-[hsl(176_85%_62%)] ring-1 ring-inset ring-[hsl(176_75%_55%)]/35">
                    <Check className="h-4 w-4 stroke-[2.75]" aria-hidden="true" />
                  </span>
                  <span className="text-[0.95rem] leading-relaxed text-white/85">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/65">
            منصة عقارية سعودية موثوقة
          </p>
        </aside>
      )}

      {/* ---------------- Form panel ---------------- */}
      <div
        className={cn(
          "relative flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:px-14",
          // In the split layout the grid row already provides full height, so
          // the panel can shrink. Standalone, it must keep min-h-screen or the
          // background wash stops partway down the page.
          aside && "lg:min-h-0",
          className,
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              "radial-gradient(70% 55% at 100% 0%, hsl(274 60% 45% / 0.09), transparent 70%)",
              "radial-gradient(60% 50% at 0% 100%, hsl(176 100% 33% / 0.08), transparent 70%)",
            ].join(","),
          }}
        />
        {/* Mobile-only logo — the brand panel is hidden below lg. */}
        <div className={cn("relative mb-8", aside ? "lg:hidden" : "")}>
          <Link
            href={ROUTES.HOME}
            className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="راعي"
          >
            <RaeiLogo size="sm" />
          </Link>
        </div>

        <div className="relative flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-[27rem]">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-[hsl(274_53%_37%)]/[0.07]">
              {/* Brand rule — ties the card to the panel opposite it. */}
              <div
                aria-hidden="true"
                className="h-1 bg-gradient-to-l from-[hsl(274_53%_40%)] via-[hsl(204_100%_37%)] to-[hsl(176_100%_36%)]"
              />
              <div className="px-6 py-7 sm:px-8 sm:py-8">
                <div className="mb-6">
                  <h1 className="text-[1.6rem] font-extrabold leading-tight tracking-tight">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {subtitle}
                    </p>
                  )}
                </div>

                {children}
              </div>
            </div>

            {footer && (
              <div className="mt-5 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
