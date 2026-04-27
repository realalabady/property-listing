import type { Timestamp } from "firebase/firestore";
import type { LeadStatus } from "@/constants/listing-categories";

export type LeadSource =
  | "website_form"
  | "whatsapp"
  | "phone"
  | "walk_in"
  | "social_media"
  | "referral"
  | "marketplace"
  | "other";

export interface LeadNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Timestamp | Date;
}

export interface Lead {
  id: string;
  companyId: string;

  name: string;
  phone: string;
  email?: string;
  message?: string;
  preferredContactMethod?: "phone" | "whatsapp" | "email";

  listingId?: string | null;
  listingTitle?: string; // denormalized

  source: LeadSource;
  assignedTo?: string | null; // employee uid
  assignedToName?: string; // denormalized
  assignedAt?: Timestamp | Date | null;

  status: LeadStatus;

  firstResponseAt?: Timestamp | Date | null;
  responseTimeMinutes?: number | null; // computed when first response logged

  notes?: LeadNote[];
  tags?: string[];

  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
