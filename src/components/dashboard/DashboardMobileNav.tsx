"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { t } from "@/lib/i18n";
import { DashboardSidebar } from "./DashboardSidebar";

interface DashboardMobileNavProps {
  companyName: string;
  companyLogo: string;
}

/**
 * Mobile/tablet navigation (< lg). The desktop sidebar is hidden below lg, so
 * this renders a menu button in the header plus a slide-in drawer that reuses
 * the same {@link DashboardSidebar}. Closes on route change, on Escape, and on
 * backdrop tap; locks body scroll while open.
 */
export function DashboardMobileNav({
  companyName,
  companyLogo,
}: DashboardMobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  // Portal target (document.body) is only available on the client.
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Navigating to a new page should dismiss the drawer.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("dashboard.openMenu")}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {mounted &&
        open &&
        createPortal(
          // Portaled to <body>, outside the dashboard's `.enterprise` wrapper,
          // so re-apply it here — otherwise the drawer falls back to the
          // default `:root` (legacy green) theme instead of the Wazi palette.
          <div
            className="enterprise fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
          >
          <button
            type="button"
            aria-label={t("dashboard.closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 start-0 flex w-72 max-w-[85%] flex-col border-e border-border bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Link
                href={ROUTES.DASHBOARD}
                aria-label={companyName}
                className="flex min-w-0 items-center gap-2.5"
              >
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={t("dashboard.logoAlt", { name: companyName })}
                    className="h-10 w-auto max-w-[160px] object-contain"
                  />
                ) : (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
                      {companyName.trim()[0]?.toUpperCase() ?? "C"}
                    </div>
                    <span className="truncate text-[15px] font-semibold text-foreground">
                      {companyName}
                    </span>
                  </>
                )}
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("dashboard.closeMenu")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DashboardSidebar />
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
