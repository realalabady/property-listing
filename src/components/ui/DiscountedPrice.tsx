import type { ReactNode } from "react";
import { SARPrice } from "./SARPrice";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface DiscountedPriceProps {
  price: number;
  /** Amount subtracted from `price`. 0/undefined/invalid renders the plain price. */
  discount?: number | null;
  /** Class for the effective (post-discount) price — matches the plain price size. */
  className?: string;
  /** Trailing node, e.g. the rent-period suffix. */
  suffix?: ReactNode;
  /** Show a "خصم …" savings badge next to the price. */
  badge?: boolean;
}

/**
 * Renders a price, and when a valid discount is present shows the effective
 * price with the original struck through. A discount only applies when it is a
 * positive amount strictly below the price.
 */
export function DiscountedPrice({
  price,
  discount,
  className,
  suffix,
  badge = false,
}: DiscountedPriceProps) {
  const hasDiscount =
    typeof discount === "number" &&
    Number.isFinite(discount) &&
    discount > 0 &&
    discount < price;

  if (!hasDiscount) {
    return (
      <span className={className}>
        <SARPrice amount={price} />
        {suffix}
      </span>
    );
  }

  const effective = price - discount;

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={className}>
        <SARPrice amount={effective} />
        {suffix}
      </span>
      <span className="text-sm font-normal text-muted-foreground line-through">
        <SARPrice amount={price} />
      </span>
      {badge && (
        <span
          className={cn(
            "rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold",
            "text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
          )}
        >
          خصم {formatNumber(discount)}
        </span>
      )}
    </span>
  );
}
