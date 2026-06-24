"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes";
import {
  getCompanyBySlug,
  getPublicCompanyListings,
  type PublicCompany,
  type PublicListing,
} from "./data";
import { ListingCard } from "./ListingCard";
import { publicCompanyThemeStyle } from "./theme";
import { t } from "@/lib/i18n";

interface CompanyLandingClientProps {
  slug: string;
}

export function CompanyLandingClient({ slug }: CompanyLandingClientProps) {
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const companyData = await getCompanyBySlug(slug);
        if (!mounted) return;

        if (!companyData) {
          setCompany(null);
          setListings([]);
          setLoading(false);
          return;
        }

        setCompany(companyData);
        const rows = await getPublicCompanyListings(companyData.id);
        if (!mounted) return;
        setListings(rows.slice(0, 6));
        setLoading(false);
      } catch (loadError) {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("companyPublic.loadCompanyFailed"),
        );
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="container-tight py-12">
        <p className="text-sm text-muted-foreground">
          {t("companyPublic.loadingProfile")}
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container-tight py-12">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="container-tight py-12">
        <p className="text-sm text-muted-foreground">
          {t("companyPublic.companyNotFound")}
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-12 pb-12" style={publicCompanyThemeStyle(company)}>
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_hsl(var(--accent)/0.2),_transparent_45%)]">
        <div className="container-tight py-16">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {company.slug}
            </span>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              {company.name}
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              {company.description}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={ROUTES.COMPANY_PROPERTIES(slug)}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {t("companyPublic.exploreProperties")}
              </Link>
              <Link
                href={ROUTES.COMPANY_CONTACT(slug)}
                className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary"
              >
                {t("companyPublic.contactCompany")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-tight space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("companyPublic.featuredListings")}
          </h2>
          <Link
            href={ROUTES.COMPANY_PROPERTIES(slug)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t("companyPublic.viewAllListings")}
          </Link>
        </div>

        {listings.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            {t("companyPublic.noFeatured")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                href={ROUTES.COMPANY_LISTING(slug, listing.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="container-tight">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-semibold">
            {t("companyPublic.contact")}
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <p>
              {t("companyPublic.phone", {
                value: company.phone || t("companyPublic.notProvided"),
              })}
            </p>
            <p>
              {t("companyPublic.email", {
                value: company.email || t("companyPublic.notProvided"),
              })}
            </p>
            <p>
              {t("companyPublic.whatsapp", {
                value: company.whatsapp || t("companyPublic.notProvided"),
              })}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
