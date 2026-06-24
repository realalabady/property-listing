import { formatNumber } from "@/lib/utils/format";

interface SARPriceProps {
  amount: number;
  className?: string;
}

export function SARPrice({ amount, className }: SARPriceProps) {
  return (
    <span className={className}>
      <span className="icon-saudi_riyal" aria-hidden="true">
        &#xea;
      </span>{" "}
      {formatNumber(amount)}
    </span>
  );
}
