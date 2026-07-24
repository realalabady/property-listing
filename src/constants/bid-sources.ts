/**
 * Channels through which a bidder reached the company for an auction bid.
 * Shared by the place-bid form and the API so both validate the same set.
 */
export const BID_SOURCES = {
  IN_PERSON: "in_person",
  WHATSAPP: "whatsapp",
  PHONE: "phone",
  WEBSITE: "website",
  SOCIAL: "social",
  REFERRAL: "referral",
  OTHER: "other",
} as const;

export type BidSource = (typeof BID_SOURCES)[keyof typeof BID_SOURCES];

export const BID_SOURCE_LABELS: Record<BidSource, string> = {
  [BID_SOURCES.IN_PERSON]: "حضوري (وجهاً لوجه)",
  [BID_SOURCES.WHATSAPP]: "واتساب",
  [BID_SOURCES.PHONE]: "مكالمة هاتفية",
  [BID_SOURCES.WEBSITE]: "الموقع الإلكتروني",
  [BID_SOURCES.SOCIAL]: "وسائل التواصل الاجتماعي",
  [BID_SOURCES.REFERRAL]: "توصية / إحالة",
  [BID_SOURCES.OTHER]: "أخرى",
};

export const BID_SOURCE_VALUES: BidSource[] = Object.values(BID_SOURCES);

export function isValidBidSource(value: unknown): value is BidSource {
  return (
    typeof value === "string" &&
    (BID_SOURCE_VALUES as string[]).includes(value)
  );
}
