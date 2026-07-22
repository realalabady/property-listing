"use client";

import Link from "next/link";
import { Bath, BedDouble, MapPin, Ruler, Sofa, Sparkles } from "lucide-react";
import { LISTING_TYPE_LABELS } from "@/constants/listing-categories";
import { SARPrice } from "@/components/ui/SARPrice";
import { DiscountedPrice } from "@/components/ui/DiscountedPrice";
import { ROUTES } from "@/constants/routes";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";
import { rentPeriodSuffix } from "./filters";
import type { PublicListing } from "./data";

interface ListingCardProps {
  listing: PublicListing;
  href?: string;
  /** Ring-highlights the card (driven by map-pin hover in the split view). */
  highlighted?: boolean;
  /** Reports card hover upward so the map can highlight the matching pin. */
  onHoverChange?: (hovered: boolean) => void;
}

/**
 * "3" when min === max, "1 - 3" when they differ, null when unknown — lets a
 * building advertise the spread of its available units in one line.
 */
function specRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const lo = min ?? max!;
  const hi = max ?? min!;
  return lo === hi ? String(lo) : `${lo} - ${hi}`;
}

export function ListingCard({
  listing,
  href,
  highlighted = false,
  onHoverChange,
}: ListingCardProps) {
  const target = href ?? ROUTES.MARKETPLACE_LISTING(listing.id);

  const isMultiUnit = listing.unitsTotal > 0;
  const bedroomsRange = specRange(
    listing.unitsBedroomsMin,
    listing.unitsBedroomsMax,
  );
  const areaRange = specRange(listing.unitsAreaMin, listing.unitsAreaMax);

  return (
    <article
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className={cn(
        "group overflow-hidden rounded-2xl border bg-card shadow-sm transition",
        highlighted
          ? "-translate-y-0.5 border-primary shadow-md ring-2 ring-primary/40"
          : "border-border hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      {/* Image is the biggest click target — link it, and zoom softly on hover */}
      <Link
        href={target}
        className="relative block h-44 w-full overflow-hidden bg-secondary"
        tabIndex={-1}
        aria-hidden="true"
      >
        {listing.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverImage}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {t("marketplace.noMedia")}
          </div>
        )}

        {/* Badges live on the image now — frees a whole text row in the body */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-md bg-background/90 px-2 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
            {LISTING_TYPE_LABELS[listing.type].ar}
          </span>
          {listing.featured && (
            <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
              {t("marketplace.featured")}
            </span>
          )}
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">
            <Link href={target} className="hover:underline">
              {listing.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {listing.city || t("marketplace.locationPending")}
          </p>
          {(listing.planNumber || listing.blockNumber) && (
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {listing.planNumber && (
                <span>رقم المخطط: {listing.planNumber}</span>
              )}
              {listing.blockNumber && (
                <span>رقم البلوك: {listing.blockNumber}</span>
              )}
            </p>
          )}
        </div>

        {/* Specs — icons read faster than labels, and hide when absent
            (land listings have no bedrooms/bathrooms).
            For a multi-unit building the parent's own bed/bath/area describe
            nothing a buyer can rent, so we show the AVAILABLE units' ranges
            instead (aggregated server-side; unit docs stay internal). */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {isMultiUnit ? (
            <>
              {bedroomsRange && (
                <span className="flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4" />
                  {t("marketplace.bed", { n: bedroomsRange })}
                </span>
              )}
              {areaRange && (
                <span className="flex items-center gap-1.5">
                  <Ruler className="h-4 w-4" />
                  {t("marketplace.sqm", { n: areaRange })}
                </span>
              )}
              {listing.unitsLivingRoomsMax != null &&
                listing.unitsLivingRoomsMax > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Sofa className="h-4 w-4" />
                    {t("marketplace.living", { n: listing.unitsLivingRoomsMax })}
                  </span>
                )}
              {listing.unitsAnyFurnished && (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  {t("marketplace.furnished")}
                </span>
              )}
            </>
          ) : (
            <>
              {listing.bedrooms != null && (
                <span className="flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4" />
                  {t("marketplace.bed", { n: listing.bedrooms })}
                </span>
              )}
              {listing.bathrooms != null && (
                <span className="flex items-center gap-1.5">
                  <Bath className="h-4 w-4" />
                  {t("marketplace.bath", { n: listing.bathrooms })}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Ruler className="h-4 w-4" />
                {t("marketplace.sqm", { n: listing.area })}
              </span>
            </>
          )}
        </div>

        {/* Multi-unit building (note 6): only aggregates are public — the
            individual units and their tenants stay internal to the company. */}
        {isMultiUnit && (
          <p className="text-sm font-medium text-primary">
            {t("marketplace.unitsAvailable", { n: listing.unitsAvailable })}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          {/* A building's own price means little when its units are priced
              individually — advertise the cheapest available unit instead. */}
          <p className="text-lg font-semibold text-foreground">
            {isMultiUnit && listing.unitsMinPrice != null ? (
              <>
                <span className="me-1 text-xs font-normal text-muted-foreground">
                  {t("marketplace.priceFrom")}
                </span>
                <SARPrice amount={listing.unitsMinPrice} />
              </>
            ) : (
              <DiscountedPrice
                price={listing.price}
                discount={listing.discount}
                suffix={
                  listing.type === "rent" ? (
                    <span className="ms-1 text-xs font-normal text-muted-foreground">
                      {rentPeriodSuffix(listing.type, listing.rentPeriod)}
                    </span>
                  ) : undefined
                }
              />
            )}
          </p>
          <Link
            href={target}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold transition hover:bg-secondary"
          >
            {t("marketplace.viewDetails")}
          </Link>
        </div>
      </div>
    </article>
  );
}
