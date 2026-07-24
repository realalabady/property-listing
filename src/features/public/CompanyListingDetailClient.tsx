"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, MapPin, MessageCircle, Share2 } from "lucide-react";
import { UnitsDialog } from "./UnitsDialog";
import { ROUTES } from "@/constants/routes";
import { DiscountedPrice } from "@/components/ui/DiscountedPrice";
import { AuctionBadge } from "@/components/ui/AuctionBadge";
import {
  LISTING_CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  type ListingCategory,
} from "@/constants/listing-categories";
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
  /** Server-rendered seed data. When provided the client skips its own fetch,
   *  so the page paints immediately with no post-hydration Firestore round-trip. */
  initialCompany?: PublicCompany | null;
  initialListing?: PublicListing | null;
}

export function CompanyListingDetailClient({
  slug,
  listingId,
  initialCompany,
  initialListing,
}: CompanyListingDetailClientProps) {
  const seeded =
    initialCompany !== undefined || initialListing !== undefined;
  const [company, setCompany] = useState<PublicCompany | null>(
    initialCompany ?? null,
  );
  const [listing, setListing] = useState<PublicListing | null>(
    initialListing ?? null,
  );
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState(0);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Native share sheet when available (mobile), else copy the link.
  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = listing?.title ?? "";
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: t("marketplace.shareText", { title }),
          url,
        });
        return;
      } catch {
        // user dismissed the sheet — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* clipboard blocked — nothing else to do */
    }
  }, [listing?.title]);

  useEffect(() => {
    // Server already provided the data — no client fetch needed.
    if (seeded) return;

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

  const mapHref =
    listing.lat != null && listing.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`
      : null;
  const locationText =
    [listing.district, listing.city, listing.region]
      .filter(Boolean)
      .join(" · ") || t("marketplace.locationPending");
  const categoryLabel =
    LISTING_CATEGORY_LABELS[listing.category as ListingCategory]?.ar;

  // Contact the current owner (the assigned agent, else the creator) through a
  // server redirect that resolves their WhatsApp at click time — the number is
  // never exposed in the public payload. Falls back to the company contact.
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const contactHref =
    `/api/companies/${listing.companyId}/listings/${listing.id}/contact` +
    (pageUrl ? `?u=${encodeURIComponent(pageUrl)}` : "");

  return (
    <main
      className="container-tight py-12"
      style={publicCompanyThemeStyle(company)}
    >
      <div className="mb-6">
        <Link
          href={ROUTES.COMPANY_PROPERTIES(slug)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t("companyPublic.backToProperties")}
        </Link>
      </div>

      <article className="overflow-hidden rounded-2xl border border-border bg-card">
        {(() => {
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
                {t("companyPublic.noMedia")}
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
            {t("marketplace.by", { company: company.name })}
          </p>

          <p className="text-3xl font-semibold">
            <DiscountedPrice
              price={listing.price}
              discount={listing.discount}
              badge
            />
          </p>

          <AuctionBadge auction={listing.auction} variant="block" />

          {/* Location + map link */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {locationText}
            </span>
            {mapHref && (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                {t("marketplace.viewOnMap")}
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-y border-border py-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("marketplace.propertyType")}
              </p>
              <p className="font-semibold text-foreground">
                {categoryLabel ?? LISTING_TYPE_LABELS[listing.type].ar}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">غرف النوم</p>
              <p className="font-semibold text-foreground">{listing.bedrooms}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">دورات المياه</p>
              <p className="font-semibold text-foreground">
                {listing.bathrooms}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المساحة</p>
              <p className="font-semibold text-foreground">
                {t("marketplace.sqm", { n: listing.area })}
              </p>
            </div>
          </div>

          {/* Multi-unit building: public side only sees availability + price
              range; units and tenants stay internal to the company. */}
          {listing.unitsTotal > 0 &&
            (() => {
              const hasUnitDetails = listing.units.length > 0;
              const body = (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">
                      {t("marketplace.unitsAvailable", {
                        n: listing.unitsAvailable,
                      })}
                    </p>
                    {listing.unitsMinPrice !== null && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {listing.unitsMaxPrice &&
                        listing.unitsMaxPrice !== listing.unitsMinPrice
                          ? t("marketplace.unitsPriceRange", {
                              min: listing.unitsMinPrice.toLocaleString("en-US"),
                              max: listing.unitsMaxPrice.toLocaleString("en-US"),
                            })
                          : t("marketplace.unitsPriceFrom", {
                              min: listing.unitsMinPrice.toLocaleString("en-US"),
                            })}
                      </p>
                    )}
                  </div>
                  {hasUnitDetails && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                      {t("marketplace.viewUnits")}
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                </div>
              );

              return hasUnitDetails ? (
                <button
                  type="button"
                  onClick={() => setUnitsOpen(true)}
                  className="w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-start transition hover:border-primary/60 hover:bg-primary/10"
                >
                  {body}
                </button>
              ) : (
                <div className="w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                  {body}
                </div>
              );
            })()}

          {/* Actions: contact the company + share the offer */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:flex-none"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t("companyPublic.inquireNow")}
            </a>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary sm:flex-none"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {shareCopied
                ? t("marketplace.shareCopied")
                : t("marketplace.shareOffer")}
            </button>
          </div>
        </div>
      </article>

      {/* Unit details popup — reads only the sanitized publicUnits array. */}
      <UnitsDialog
        units={listing.units}
        open={unitsOpen}
        onClose={() => setUnitsOpen(false)}
      />
    </main>
  );
}
