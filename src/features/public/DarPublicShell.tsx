import Link from "next/link";
import type { ReactNode } from "react";
import { Home } from "lucide-react";
import { ROUTES } from "@/constants/routes";

/**
 * Shared light "Dar" chrome for public, no-auth pages (marketplace, listing
 * detail). Keeps the rebranded marketing experience consistent across the
 * Dar-owned public surface. Per-agency `/c/[slug]` storefronts intentionally
 * keep their own white-label theme and do NOT use this shell.
 */
export function DarPublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="dar-light min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="container-tight flex h-16 items-center justify-between gap-4">
          <Link href={ROUTES.HOME} className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Home className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight">دار</span>
              <span className="text-[11px] text-muted-foreground">
                ابحث عن عقارك التالي
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link
              href={ROUTES.MARKETPLACE}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              العقارات
            </Link>
            <Link
              href={ROUTES.LOGIN}
              className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              تسجيل الدخول
            </Link>
            <Link
              href={ROUTES.LOGIN}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              أضف عقارك
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-10 border-t border-border">
        <div className="container-tight flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </span>
            <span className="font-bold text-foreground">دار</span>
          </div>
          <p>© {new Date().getFullYear()} دار. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <Link href={ROUTES.MARKETPLACE} className="hover:text-foreground">
              العقارات
            </Link>
            <Link href={ROUTES.LOGIN} className="hover:text-foreground">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
