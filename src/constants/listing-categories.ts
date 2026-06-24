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
