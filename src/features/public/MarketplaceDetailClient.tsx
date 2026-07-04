"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes";
import { SARPrice } from "@/components/ui/SARPrice";
import { LISTING_TYPE_LABELS } from "@/constants/listing-categories";
import { t } from "@/lib/i18n";
import {
  getCompanyListingById,
  getGlobalListingById,
  type PublicListing,
} from "./data";

interface MarketplaceDetailClientProps {
  listingId: string;
}

export function MarketplaceDetailClient({
  listingId,
}: MarketplaceDetailClientProps) {
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState(0);

  useEffect(() => {
    let mounted = true;

    // The global marketplace mirror only stores the cover image. To show the
    // full gallery, resolve the source company listing (which holds media[]).
    (async () => {
      try {
        const global = await getGlobalListingById(listingId);
        if (!global) {
          if (mounted) {
            setListing(null);
            setLoading(false);
          }
          return;
        }
        let full = global;
        if (global.companyId) {
          const source = await getCompanyListingById(
            global.companyId,
            listingId,
          ).catch(() => null);
          if (source) full = source;
        }
        if (!mounted) return;
        setListing(full);
        setLoading(false);
      } catch (loadError) {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("marketplace.loadDetailFailed"),
        );
        setLoading(false);
      }
    })();

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
        {(() => {
          // Prefer the full media gallery; fall back to the cover image alone.
          const gallery =
            listing.media.length > 0
              ? listing.media
              : listing.coverImage
                ? [
                    {
                      url: listing.coverImage,
                      type: "image" as const,
                      order: 0,
                      isCover: true,
                    },
                  ]
                : [];
          const selected = gallery[activeMedia] ?? gallery[0];

          if (!selected) {
            return (
              <div className="flex h-72 w-full items-center justify-center bg-secondary text-sm text-muted-foreground">
                {t("marketplace.noMedia")}
              </div>
            );
          }

          return (
            <div>
              <div className="h-80 w-full bg-secondary md:h-96">
                {selected.type === "video" ? (
                  <video
                    src={selected.url}
                    className="h-full w-full object-contain"
                    controls
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.url}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              {gallery.length > 1 && (
                <div className="flex flex-wrap gap-2 p-3">
                  {gallery.map((item, index) => (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      onClick={() => setActiveMedia(index)}
                      className={
                        "h-16 w-20 overflow-hidden rounded-md border bg-secondary transition " +
                        (index === activeMedia
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50")
                      }
                    >
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

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
