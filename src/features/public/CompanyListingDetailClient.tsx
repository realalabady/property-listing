"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes";
import { SARPrice } from "@/components/ui/SARPrice";
import { LISTING_TYPE_LABELS } from "@/constants/listing-categories";
import {
  getCompanyBySlug,
  getCompanyListingById,
  type PublicCompany,
  type PublicListing,
} from "./data";
import { publicCompanyThemeStyle } from "./theme";
import { t } from "@/lib/i18n";

interface CompanyListingDetailClientProps {
  slug: string;
  listingId: string;
}

export function CompanyListingDetailClient({
  slug,
  listingId,
}: CompanyListingDetailClientProps) {
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [listing, setListing] = useState<PublicListing | null>(null);
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
          setListing(null);
          setLoading(false);
          return;
        }

        setCompany(companyData);
        const listingData = await getCompanyListingById(
          companyData.id,
          listingId,
        );
        if (!mounted) return;

        setListing(listingData);
        setLoading(false);
      } catch (loadError) {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("companyPublic.loadListingFailed"),
        );
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [listingId, slug]);

  if (loading) {
    return (
      <main className="container-tight py-12">
        <p className="text-sm text-muted-foreground">
          {t("companyPublic.loadingListing")}
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

  if (!company || !listing) {
    return (
      <main className="container-tight py-12">
        <p className="text-sm text-muted-foreground">
          {t("companyPublic.listingNotFound")}
        </p>
      </main>
    );
  }

  return (
    <main
      className="container-tight py-12"
      style={publicCompanyThemeStyle(company)}
    >
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={ROUTES.COMPANY_PROPERTIES(slug)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t("companyPublic.backToProperties")}
        </Link>
        <Link
          href={ROUTES.COMPANY_CONTACT(slug)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {t("companyPublic.inquireNow")}
        </Link>
      </div>

      <article className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-72 w-full bg-secondary">
          {listing.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.coverImage}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("companyPublic.noMedia")}
            </div>
          )}
        </div>

        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {listing.title}
            </h1>
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold">
              {LISTING_TYPE_LABELS[listing.type].ar}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            {listing.city || t("companyPublic.locationPending")} •{" "}
            {company.name}
          </p>

          <p className="text-3xl font-semibold">
            <SARPrice amount={listing.price} />
          </p>

          <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <p>{t("companyPublic.bedrooms", { n: listing.bedrooms })}</p>
            <p>{t("companyPublic.bathrooms", { n: listing.bathrooms })}</p>
            <p>{t("companyPublic.areaSqm", { n: listing.area })}</p>
          </div>
        </div>
      </article>
    </main>
  );
}
