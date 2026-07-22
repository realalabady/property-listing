export const LISTING_TYPES = {
  RENT: "rent",
  SALE: "sale",
  OFF_PLAN: "off_plan",
  TAKEOVER: "takeover",
} as const;

export type ListingType = (typeof LISTING_TYPES)[keyof typeof LISTING_TYPES];

export const LISTING_TYPE_LABELS: Record<
  ListingType,
  { en: string; ar: string }
> = {
  [LISTING_TYPES.RENT]: { en: "For Rent", ar: "للإيجار" },
  [LISTING_TYPES.SALE]: { en: "For Sale", ar: "للبيع" },
  [LISTING_TYPES.OFF_PLAN]: { en: "Off-Plan", ar: "على الخريطة" },
  [LISTING_TYPES.TAKEOVER]: { en: "For Takeover", ar: "للتقبيل" },
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
  CHALET: "chalet",
  REST_HOUSE: "rest_house",
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
  [LISTING_CATEGORIES.CHALET]: { en: "Chalet", ar: "شاليه" },
  [LISTING_CATEGORIES.REST_HOUSE]: { en: "Rest House", ar: "استراحة" },
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

export const LISTING_STATUS_LABELS: Record<
  ListingStatus,
  { en: string; ar: string }
> = {
  [LISTING_STATUSES.DRAFT]: { en: "Draft", ar: "مسودة" },
  [LISTING_STATUSES.PUBLISHED]: { en: "Published", ar: "منشور" },
  [LISTING_STATUSES.PENDING_REVIEW]: { en: "Pending Review", ar: "قيد المراجعة" },
  [LISTING_STATUSES.SOLD]: { en: "Sold", ar: "تم البيع" },
  [LISTING_STATUSES.RENTED]: { en: "Rented", ar: "تم التأجير" },
  [LISTING_STATUSES.ARCHIVED]: { en: "Archived", ar: "مؤرشف" },
};

/**
 * Coerce a raw (DB / network) value to a KNOWN enum member, never just a
 * non-null one. A listing saved with an empty string or a legacy/unknown
 * `type`/`category`/`status` would otherwise pass a `?? default` guard
 * untouched and later make `LISTING_*_LABELS[value].ar` throw
 * "Cannot read properties of undefined (reading 'ar')", 500-ing every page
 * that renders it. Always run DB values through these before indexing a label
 * map or setting a typed field.
 */
export function coerceListingType(value: unknown): ListingType {
  return typeof value === "string" && value in LISTING_TYPE_LABELS
    ? (value as ListingType)
    : LISTING_TYPES.SALE;
}

export function coerceListingCategory(value: unknown): ListingCategory {
  return typeof value === "string" && value in LISTING_CATEGORY_LABELS
    ? (value as ListingCategory)
    : LISTING_CATEGORIES.APARTMENT;
}

export function coerceListingStatus(value: unknown): ListingStatus {
  return typeof value === "string" && value in LISTING_STATUS_LABELS
    ? (value as ListingStatus)
    : LISTING_STATUSES.DRAFT;
}

export const LEAD_STATUSES = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  DEAL: "deal",
  LOST: "lost",
} as const;

export type LeadStatus = (typeof LEAD_STATUSES)[keyof typeof LEAD_STATUSES];

export const LEAD_STATUS_LABELS: Record<
  LeadStatus,
  { en: string; ar: string }
> = {
  [LEAD_STATUSES.NEW]: { en: "New", ar: "جديد" },
  [LEAD_STATUSES.CONTACTED]: { en: "Contacted", ar: "تم التواصل" },
  [LEAD_STATUSES.QUALIFIED]: { en: "Qualified", ar: "مؤهل" },
  [LEAD_STATUSES.DEAL]: { en: "Deal", ar: "صفقة" },
  [LEAD_STATUSES.LOST]: { en: "Lost", ar: "مفقود" },
};

/**
 * Every value the `lead.source` field can carry. `landing_request` is set by
 * the marketplace claim flow; the rest come from manual entry / public forms.
 * ALWAYS render sources through LEAD_SOURCE_LABELS — never the raw key.
 */
export const LEAD_SOURCES = {
  WEBSITE_FORM: "website_form",
  WHATSAPP: "whatsapp",
  PHONE: "phone",
  WALK_IN: "walk_in",
  SOCIAL_MEDIA: "social_media",
  REFERRAL: "referral",
  MARKETPLACE: "marketplace",
  LANDING_REQUEST: "landing_request",
  OTHER: "other",
} as const;

export type LeadSourceKey = (typeof LEAD_SOURCES)[keyof typeof LEAD_SOURCES];

export const LEAD_SOURCE_LABELS: Record<
  LeadSourceKey,
  { en: string; ar: string }
> = {
  [LEAD_SOURCES.WEBSITE_FORM]: { en: "Website form", ar: "نموذج الموقع" },
  [LEAD_SOURCES.WHATSAPP]: { en: "WhatsApp", ar: "واتساب" },
  [LEAD_SOURCES.PHONE]: { en: "Phone call", ar: "اتصال هاتفي" },
  [LEAD_SOURCES.WALK_IN]: { en: "Walk-in", ar: "زيارة المكتب" },
  [LEAD_SOURCES.SOCIAL_MEDIA]: { en: "Social media", ar: "وسائل التواصل" },
  [LEAD_SOURCES.REFERRAL]: { en: "Referral", ar: "ترشيح" },
  [LEAD_SOURCES.MARKETPLACE]: { en: "Marketplace", ar: "السوق" },
  [LEAD_SOURCES.LANDING_REQUEST]: { en: "Incoming request", ar: "طلب وارد" },
  [LEAD_SOURCES.OTHER]: { en: "Other", ar: "أخرى" },
};

/**
 * Optional lead priority. Absent/null means unprioritized — priority is a
 * team signal, not a required field.
 */
export const LEAD_PRIORITIES = {
  URGENT: "urgent",
  HIGH: "high",
  NORMAL: "normal",
} as const;

export type LeadPriority =
  (typeof LEAD_PRIORITIES)[keyof typeof LEAD_PRIORITIES];

export const LEAD_PRIORITY_LABELS: Record<
  LeadPriority,
  { en: string; ar: string }
> = {
  [LEAD_PRIORITIES.URGENT]: { en: "Urgent", ar: "عاجل" },
  [LEAD_PRIORITIES.HIGH]: { en: "High", ar: "مرتفع" },
  [LEAD_PRIORITIES.NORMAL]: { en: "Normal", ar: "عادي" },
};

export function parseLeadPriority(value: unknown): LeadPriority | null {
  return value === LEAD_PRIORITIES.URGENT ||
    value === LEAD_PRIORITIES.HIGH ||
    value === LEAD_PRIORITIES.NORMAL
    ? value
    : null;
}

/** Arabic label for a lead source; falls back to "أخرى" for unknown keys. */
export function leadSourceLabelAr(source: string): string {
  return (
    LEAD_SOURCE_LABELS[source as LeadSourceKey]?.ar ??
    LEAD_SOURCE_LABELS[LEAD_SOURCES.OTHER].ar
  );
}

export const TASK_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TaskPriority =
  (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];

export const TASK_PRIORITY_LABELS: Record<
  TaskPriority,
  { en: string; ar: string }
> = {
  [TASK_PRIORITIES.LOW]: { en: "Low", ar: "منخفضة" },
  [TASK_PRIORITIES.MEDIUM]: { en: "Medium", ar: "متوسطة" },
  [TASK_PRIORITIES.HIGH]: { en: "High", ar: "عالية" },
  [TASK_PRIORITIES.URGENT]: { en: "Urgent", ar: "عاجلة" },
};

export const TASK_STATUSES = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CANCELLED: "cancelled",
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const TASK_STATUS_LABELS: Record<
  TaskStatus,
  { en: string; ar: string }
> = {
  [TASK_STATUSES.TODO]: { en: "To Do", ar: "قيد الانتظار" },
  [TASK_STATUSES.IN_PROGRESS]: { en: "In Progress", ar: "قيد التنفيذ" },
  [TASK_STATUSES.DONE]: { en: "Done", ar: "مكتملة" },
  [TASK_STATUSES.CANCELLED]: { en: "Cancelled", ar: "ملغاة" },
};
