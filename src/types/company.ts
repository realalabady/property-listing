import type { Timestamp } from "firebase/firestore";

export type SubscriptionPlanId = "free" | "starter" | "pro" | "enterprise";

export type CompanyStatus = "active" | "suspended" | "trial" | "cancelled";

export interface CompanyTheme {
  primaryColor: string; // hex
  secondaryColor: string; // hex
  accentColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  darkMode?: boolean;
}

export interface CompanyContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  mapUrl?: string;
  website?: string;
  socials?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
  };
}

export interface Company {
  id: string;
  name: string;
  nameAr?: string;
  slug: string; // unique, URL-safe
  description?: string;
  descriptionAr?: string;
  logo?: string;
  theme: CompanyTheme;
  subscriptionPlan: SubscriptionPlanId;
  ownerId: string; // uid of company_owner
  status: CompanyStatus;
  contact: CompanyContact;
  supportedLanguages: ("en" | "ar")[];
  defaultLanguage: "en" | "ar";
  listingsCount: number; // denormalized counter
  activeEmployeesCount: number; // denormalized counter
  trialEndsAt?: Timestamp | Date | null;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface CompanySettings {
  id: string;
  companyId: string;
  leadAutoAssign: boolean;
  leadAutoAssignStrategy: "round_robin" | "least_busy" | "manual";
  taskEscalationHours: number; // e.g. 24 → tasks overdue > 24h escalate
  whatsappCtaNumber?: string;
  notificationEmails: string[];
  integrations: {
    googleAnalyticsId?: string;
    metaPixelId?: string;
    recaptchaSiteKey?: string;
  };
  updatedAt: Timestamp | Date;
}
