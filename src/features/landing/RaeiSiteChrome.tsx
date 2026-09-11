"use client";

import Link from "next/link";
import { Globe, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export type Locale = "ar" | "en";
export type Localized = { ar: string; en: string };

export const tr = (value: Localized, locale: Locale) => value[locale];

export const brand: Localized = { ar: "راعي", en: "Raei" };
const brandTagline: Localized = {
  ar: "ابحث عن عقارك التالي",
  en: "Find your next property",
};

const navLinks: Array<{ href: string; label: Localized }> = [
  { href: ROUTES.MARKETPLACE, label: { ar: "العقارات", en: "Properties" } },
  { href: "/#how", label: { ar: "كيف يعمل", en: "How it works" } },
  { href: "/#companies", label: { ar: "للشركات", en: "For agencies" } },
  { href: ROUTES.PRICING, label: { ar: "الباقات", en: "Plans" } },
];

interface RaeiSiteHeaderProps {
  locale: Locale;
  onToggleLocale: () => void;
  /** Homepage-only: opens the property request modal. Hidden when omitted. */
  onRequestProperty?: () => void;
  /** Link to /pricing — off while the admin keeps the page hidden. */
  showPricing: boolean;
}

/** Public-site header shared by the homepage and the pricing page. */
export function RaeiSiteHeader({
  locale,
  onToggleLocale,
  onRequestProperty,
  showPricing,
}: RaeiSiteHeaderProps) {
  const isArabic = locale === "ar";
  const links = showPricing
    ? navLinks
    : navLinks.filter((item) => item.href !== ROUTES.PRICING);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="container-tight flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 sm:flex-nowrap sm:py-0">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Home className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight">
              {tr(brand, locale)}
            </span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              {tr(brandTagline, locale)}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {tr(item.label, locale)}
            </Link>
          ))}
        </nav>

        <div className="flex w-full shrink-0 items-center justify-between gap-1 sm:w-auto sm:justify-end sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLocale}
            className="gap-1.5 px-2 sm:px-3"
          >
            <Globe className="h-4 w-4" />
            {isArabic ? "EN" : "AR"}
          </Button>
          <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
            <Link href={ROUTES.LOGIN} className="whitespace-nowrap">
              {isArabic ? "تسجيل الدخول" : "Sign in"}
            </Link>
          </Button>
          {onRequestProperty ? (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="px-2 sm:px-3"
              >
                <Link href={ROUTES.PARTNER} className="whitespace-nowrap">
                  {isArabic ? "انضم كشريك" : "Become a partner"}
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={onRequestProperty}
                className="whitespace-nowrap px-2 sm:px-3"
              >
                {isArabic ? "اطلب عقارك" : "Request property"}
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="px-2 sm:px-3">
              <Link href={ROUTES.PARTNER} className="whitespace-nowrap">
                {isArabic ? "انضم كشريك" : "Become a partner"}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function RaeiSiteFooter({
  locale,
  showPricing,
}: {
  locale: Locale;
  showPricing: boolean;
}) {
  const isArabic = locale === "ar";

  return (
    <footer className="border-t border-border">
      <div className="container-tight flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Home className="h-4 w-4" />
          </span>
          <span className="font-bold text-foreground">{tr(brand, locale)}</span>
        </div>
        <p>
          {isArabic ? (
            <>
              جميع الحقوق محفوظة{" "}
              <bdi>© {new Date().getFullYear()}</bdi> {tr(brand, locale)}
            </>
          ) : (
            <>
              <bdi>© {new Date().getFullYear()}</bdi> {tr(brand, locale)}. All
              rights reserved.
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href={ROUTES.MARKETPLACE} className="hover:text-foreground">
            {isArabic ? "العقارات" : "Properties"}
          </Link>
          {showPricing && (
            <Link href={ROUTES.PRICING} className="hover:text-foreground">
              {isArabic ? "الباقات" : "Plans"}
            </Link>
          )}
          <Link href={ROUTES.PARTNER} className="hover:text-foreground">
            {isArabic ? "انضم كشريك" : "Become a partner"}
          </Link>
          <Link href={ROUTES.LOGIN} className="hover:text-foreground">
            {isArabic ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </div>
      </div>
    </footer>
  );
}
