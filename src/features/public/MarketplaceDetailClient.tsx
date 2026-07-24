"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, MapPin, MessageCircle, Share2 } from "lucide-react";
import { UnitsDialog } from "./UnitsDialog";
import { ListingGallery } from "./ListingGallery";
import { ROUTES } from "@/constants/routes";
import { DiscountedPrice } from "@/components/ui/DiscountedPrice";
import { AuctionBadge } from "@/components/ui/AuctionBadge";
import {
  LISTING_CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  type ListingCategory,
} from "@/constants/listing-categories";
import { t } from "@/lib/i18n";
import {
  getCompanyById,
  getCompanyListingById,
  getGlobalListingById,
  type PublicCompany,
  type PublicListing,
} from "./data";

interface MarketplaceDetailClientProps {
  listingId: string;
  /** Server-rendered seed data. When provided the client skips its own fetch,
   *  so the page paints immediately with no post-hydration Firestore round-trip. */
  initialListing?: PublicListing | null;
  initialCompany?: PublicCompany | null;
}

export function MarketplaceDetailClient({
  listingId,
  initialListing,
  initialCompany,
}: MarketplaceDetailClientProps) {
  const seeded = initialListing !== undefined;
  const [listing, setListing] = useState<PublicListing | null>(
    initialListing ?? null,
  );
  const [company, setCompany] = useState<PublicCompany | null>(
    initialCompany ?? null,
  );
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState<string | null>(null);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Native share sheet when available (mobile), else copy the link. Both feed
  // the same goal: let a buyer forward the offer to someone else.
  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = listing?.title ?? "";
    if (navigator.share) {
      try {
        await navigator.share({ title, text: t("marketplace.shareText", { title }), url });
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
          // The route id is the global mirror doc id (`${companyId}_${listingId}`),
          // so use the mirror's sourceListingId to load the real company listing
          // (which holds the full media[] gallery — the mirror only has the cover).
          const source = await getCompanyListingById(
            global.companyId,
            global.sourceListingId,
          ).catch(() => null);
          if (source) full = source;
        }
        if (!mounted) return;
        setListing(full);
        setLoading(false);

        // Pull the company's public contact (WhatsApp/phone) so the buyer can
        // reach the agent who listed it. Fetch by companyId — the denormalized
        // companySlug is often missing on the mirror, so the id is reliable.
        if (full.companyId) {
          getCompanyById(full.companyId)
            .then((c) => mounted && setCompany(c))
            .catch(() => undefined);
        }
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
  // never exposed in the public payload. The endpoint falls back to the
  // company's WhatsApp, phone, then contact page.
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const companySlug = company?.slug || listing.companySlug;
  const contactHref =
    `/api/companies/${listing.companyId}/listings/${listing.id}/contact` +
    (pageUrl ? `?u=${encodeURIComponent(pageUrl)}` : "");

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
        <ListingGallery
          media={
            listing.media.length > 0
              ? listing.media
              : listing.coverImage
                ? [{ url: listing.coverImage, type: "image" as const }]
                : []
          }
          title={listing.title}
        />

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
            {t("marketplace.by", {
              company: company?.name || listing.companyName,
            })}
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
            {listing.planNumber && (
              <div>
                <p className="text-xs text-muted-foreground">رقم المخطط</p>
                <p className="font-semibold text-foreground">
                  {listing.planNumber}
                </p>
              </div>
            )}
            {listing.parcelNumber && (
              <div>
                <p className="text-xs text-muted-foreground">رقم القطعة</p>
                <p className="font-semibold text-foreground">
                  {listing.parcelNumber}
                </p>
              </div>
            )}
            {listing.blockNumber && (
              <div>
                <p className="text-xs text-muted-foreground">رقم البلوك</p>
                <p className="font-semibold text-foreground">
                  {listing.blockNumber}
                </p>
              </div>
            )}
          </div>

          {/* Multi-unit building (note 6): the public side only ever sees the
              availability count + price range — units and tenants stay
              internal to the advertising company. */}
          {/* Only clickable when we actually have unit details to show. A
              listing whose units predate `publicUnits` still has a summary
              count, so linking it would open an empty popup — show the plain
              box instead until its units are re-saved. */}
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

          {/* Actions: contact the advertiser + share the offer. Full-width
              stacked on mobile so the primary CTA never wraps; inline row on
              larger screens. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:w-auto"
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
              {t("marketplace.contactAdvertiser")}
            </a>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary sm:w-auto"
            >
              <Share2 className="h-4 w-4 shrink-0" aria-hidden />
              {shareCopied
                ? t("marketplace.shareCopied")
                : t("marketplace.shareOffer")}
            </button>
            {companySlug && (
              <Link
                href={ROUTES.COMPANY_LANDING(companySlug)}
                className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5 sm:w-auto"
              >
                {t("marketplace.visitCompany")}
              </Link>
            )}
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
