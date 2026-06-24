export function formatCurrency(
  amount: number,
  currency = "SAR",
  locale = "en-SA",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number, locale = "en-SA"): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
