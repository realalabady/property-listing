"use client";

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

interface CompanyPropertiesClientProps {
  slug: string;
}

export function CompanyPropertiesClient({
  slug,
}: CompanyPropertiesClientProps) {
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
        setListings(rows);
        setLoading(false);
      } catch (loadError) {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("companyPublic.loadListingsFailed"),
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
          {t("companyPublic.loadingProperties")}
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
    <main
      className="container-tight py-12"
      style={publicCompanyThemeStyle(company)}
    >
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("companyPublic.companyProperties", { company: company.name })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("companyPublic.publishedListings")}
        </p>
      </header>

      {listings.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {t("companyPublic.noProperties")}
        </p>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              href={ROUTES.COMPANY_LISTING(slug, listing.id)}
            />
          ))}
        </section>
      )}
    </main>
  );
}
