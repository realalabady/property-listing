export const LISTING_TYPES = {
  RENT: "rent",
  SALE: "sale",
  OFF_PLAN: "off_plan",
} as const;

export type ListingType = (typeof LISTING_TYPES)[keyof typeof LISTING_TYPES];

export const LISTING_TYPE_LABELS: Record<
  ListingType,
  { en: string; ar: string }
> = {
  [LISTING_TYPES.RENT]: { en: "For Rent", ar: "للإيجار" },
  [LISTING_TYPES.SALE]: { en: "For Sale", ar: "للبيع" },
  [LISTING_TYPES.OFF_PLAN]: { en: "Off-Plan", ar: "على الخريطة" },
};

export const LISTING_CATEGORIES = {
  APARTMENT: "apartment",
  VILLA: "villa",
  LAND: "land",
  COMMERCIAL: "commercial",
  BUILDING: "building",
  OFFICE: "office",
  WAREHOUSE: "warehouse",
  TOWNHOUSE: "townhouse",
  PENTHOUSE: "penthouse",
  STUDIO: "studio",
} as const;

export type ListingCategory =
  (typeof LISTING_CATEGORIES)[keyof typeof LISTING_CATEGORIES];

export const LISTING_CATEGORY_LABELS: Record<
  ListingCategory,
  { en: string; ar: string }
> = {
  [LISTING_CATEGORIES.APARTMENT]: { en: "Apartment", ar: "شقة" },
  [LISTING_CATEGORIES.VILLA]: { en: "Villa", ar: "فيلا" },
  [LISTING_CATEGORIES.LAND]: { en: "Land", ar: "أرض" },
  [LISTING_CATEGORIES.COMMERCIAL]: { en: "Commercial", ar: "تجاري" },
  [LISTING_CATEGORIES.BUILDING]: { en: "Building", ar: "عمارة" },
  [LISTING_CATEGORIES.OFFICE]: { en: "Office", ar: "مكتب" },
  [LISTING_CATEGORIES.WAREHOUSE]: { en: "Warehouse", ar: "مستودع" },
  [LISTING_CATEGORIES.TOWNHOUSE]: { en: "Townhouse", ar: "تاون هاوس" },
  [LISTING_CATEGORIES.PENTHOUSE]: { en: "Penthouse", ar: "بنتهاوس" },
  [LISTING_CATEGORIES.STUDIO]: { en: "Studio", ar: "ستوديو" },
};

export const LISTING_STATUSES = {
  DRAFT: "draft",
  PUBLISHED: "published",
  PENDING_REVIEW: "pending_review",
  SOLD: "sold",
  RENTED: "rented",
  ARCHIVED: "archived",
} as const;

export type ListingStatus =
  (typeof LISTING_STATUSES)[keyof typeof LISTING_STATUSES];

export const LEAD_STATUSES = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  DEAL: "deal",
  LOST: "lost",
} as const;

export type LeadStatus = (typeof LEAD_STATUSES)[keyof typeof LEAD_STATUSES];

export const TASK_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TaskPriority =
  (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];

export const TASK_STATUSES = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CANCELLED: "cancelled",
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];
