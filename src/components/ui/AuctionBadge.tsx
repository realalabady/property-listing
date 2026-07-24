import { Gavel, Clock } from "lucide-react";
import { SARPrice } from "./SARPrice";
import { CountdownTimer } from "./CountdownTimer";
import { cn } from "@/lib/utils/cn";
import type { PublicListingAuction } from "@/types/listing";

interface AuctionBadgeProps {
  auction: PublicListingAuction | null | undefined;
  /** "chip" = compact overlay pill (cards); "block" = detail-page panel. */
  variant?: "chip" | "block";
  className?: string;
}

/**
 * Public current-bid indicator for a for-sale listing that has an auction.
 * Shows the live highest bid (or "starts from" before any bid), plus a live
 * countdown when the auction has an end time. Renders nothing without an
 * enabled auction.
 */
export function AuctionBadge({
  auction,
  variant = "chip",
  className,
}: AuctionBadgeProps) {
  if (!auction || !auction.enabled) return null;

  const hasBid = typeof auction.currentBid === "number";
  const amount = hasBid ? auction.currentBid! : auction.startPrice;
  // Effectively ended = explicitly closed OR the end time has passed. The end
  // time is enforced server-side on bids; here it drives the display.
  const expired = auction.endsAt != null && auction.endsAt <= Date.now();
  const ended = auction.status === "closed" || expired;
  const timed = auction.endsAt != null;

  if (variant === "chip") {
    return (
      <div
        className={cn(
          "flex flex-col gap-1 rounded-lg border border-amber-300/70 bg-amber-50/80 px-2.5 py-1.5 dark:border-amber-800/60 dark:bg-amber-950/30",
          className,
        )}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-100">
          <Gavel className="h-3.5 w-3.5 shrink-0" />
          <span className="text-amber-700/90 dark:text-amber-300/90">
            {hasBid ? "أعلى مزايدة" : "يبدأ من"}
          </span>
          <SARPrice amount={amount} />
        </div>
        {timed &&
          (ended ? (
            <span className="text-[11px] font-semibold text-amber-700/80 dark:text-amber-300/80">
              انتهت المزايدة
            </span>
          ) : (
            <CountdownTimer endsAt={auction.endsAt!} size="sm" />
          ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100/40 dark:border-amber-800/60 dark:from-amber-950/40 dark:to-amber-900/20",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <Gavel className="h-4 w-4" />
            {ended ? "انتهت المزايدة" : "مزايدة قائمة"}
          </p>
          <p className="mt-1.5 text-3xl font-bold text-amber-900 dark:text-amber-100">
            <SARPrice amount={amount} />
          </p>
          <p className="mt-0.5 text-xs font-medium text-amber-700/80 dark:text-amber-300/80">
            {hasBid
              ? `أعلى مزايدة · ${auction.bidCount} مزايدة`
              : "سعر البداية · لا مزايدات بعد"}
          </p>
        </div>

        {timed && !ended && (
          <div className="flex flex-col items-end gap-1.5">
            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              ينتهي خلال
            </span>
            <CountdownTimer endsAt={auction.endsAt!} />
          </div>
        )}
      </div>
    </div>
  );
}
