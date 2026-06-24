"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes";
import { SARPrice } from "@/components/ui/SARPrice";
import { LISTING_TYPE_LABELS } from "@/constants/listing-categories";
import { t } from "@/lib/i18n";
import { getGlobalListingById, type PublicListing } from "./data";

interface MarketplaceDetailClientProps {
  listingId: string;
}

export function MarketplaceDetailClient({
  listingId,
}: MarketplaceDetailClientProps) {
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getGlobalListingById(listingId)
      .then((result) => {
        if (!mounted) return;
        setListing(result);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("marketplace.loadDetailFailed"),
        );
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [listingId]);

  if (loading) {
    return (
      <main className="container-tight py-12">
        <p className="text-sm text-muted-foreground">
          {t("marketplace.loadingDetail")}
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

  if (!listing) {
    return (
      <main className="container-tight py-12">
        <p className="text-sm text-muted-foreground">
          {t("marketplace.notFound")}
        </p>
      </main>
    );
  }

  return (
    <main className="container-tight py-12">
      <div className="mb-6">
        <Link
          href={ROUTES.MARKETPLACE}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t("marketplace.backToMarketplace")}
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
              {t("marketplace.noMedia")}
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
            {listing.city || t("marketplace.locationPending")} •{" "}
            {t("marketplace.by", { company: listing.companyName })}
          </p>

          <p className="text-3xl font-semibold">
            <SARPrice amount={listing.price} />
          </p>

          <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <p>{t("marketplace.bedrooms", { n: listing.bedrooms })}</p>
            <p>{t("marketplace.bathrooms", { n: listing.bathrooms })}</p>
            <p>{t("marketplace.areaSqm", { n: listing.area })}</p>
          </div>

          {listing.companySlug && (
            <Link
              href={ROUTES.COMPANY_LANDING(listing.companySlug)}
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {t("marketplace.visitCompany")}
            </Link>
          )}
        </div>
      </article>
    </main>
  );
}
