import Link from "next/link";
import { LISTING_TYPE_LABELS } from "@/constants/listing-categories";
import { SARPrice } from "@/components/ui/SARPrice";
import { ROUTES } from "@/constants/routes";
import { t } from "@/lib/i18n";
import { rentPeriodSuffix } from "./filters";
import type { PublicListing } from "./data";

interface ListingCardProps {
  listing: PublicListing;
  href?: string;
}

export function ListingCard({ listing, href }: ListingCardProps) {
  const target = href ?? ROUTES.MARKETPLACE_LISTING(listing.id);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-44 w-full bg-secondary">
        {listing.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverImage}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {t("marketplace.noMedia")}
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
            {LISTING_TYPE_LABELS[listing.type].ar}
          </span>
          {listing.featured && (
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {t("marketplace.featured")}
            </span>
          )}
        </div>

        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">
            {listing.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {listing.city || t("marketplace.locationPending")}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("marketplace.bed", { n: listing.bedrooms })}</span>
          <span>{t("marketplace.bath", { n: listing.bathrooms })}</span>
          <span>{t("marketplace.sqm", { n: listing.area })}</span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-foreground">
            <SARPrice amount={listing.price} />
            {listing.type === "rent" && (
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                {rentPeriodSuffix(listing.type, listing.rentPeriod)}
              </span>
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
