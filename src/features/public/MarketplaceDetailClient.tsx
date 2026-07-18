"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, MapPin, MessageCircle, Share2 } from "lucide-react";
import { UnitsDialog } from "./UnitsDialog";
import { ROUTES } from "@/constants/routes";
import { SARPrice } from "@/components/ui/SARPrice";
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
}

export function MarketplaceDetailClient({
  listingId,
}: MarketplaceDetailClientProps) {
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState(0);
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

  // Contact routes to the agent's company via WhatsApp (prefilled with the
  // listing), then phone, then the company's contact page as a last resort.
  const waDigits = company?.whatsapp
    ? company.whatsapp.replace(/[^\d]/g, "")
    : "";
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const contactPrefill =
    t("marketplace.contactPrefill", { title: listing.title }) +
    (pageUrl ? `\n${pageUrl}` : "");
  const companySlug = company?.slug || listing.companySlug;
  const contactHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(contactPrefill)}`
    : company?.phone
      ? `tel:${company.phone}`
      : companySlug
        ? ROUTES.COMPANY_CONTACT(companySlug)
        : null;

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
            {t("marketplace.by", {
              company: company?.name || listing.companyName,
            })}
          </p>

          <p className="text-3xl font-semibold">
            <SARPrice amount={listing.price} />
          </p>

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

          {/* Actions: contact the advertiser + share the offer */}
          <div className="flex flex-wrap items-center gap-2">
            {contactHref && (
              <a
                href={contactHref}
                target={contactHref.startsWith("http") ? "_blank" : undefined}
                rel={
                  contactHref.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:flex-none"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                {t("marketplace.contactAdvertiser")}
              </a>
            )}
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
            {companySlug && (
              <Link
                href={ROUTES.COMPANY_LANDING(companySlug)}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
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
