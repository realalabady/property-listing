import type { Timestamp } from "firebase/firestore";
import type { LeadRequirement } from "./lead";

/** One company's record of having moved a broadcast request into its leads. */
export interface LeadRequestClaim {
  leadId: string;
  byName: string;
  claimedAt: Timestamp | Date | string | null;
}

/**
 * A customer-submitted "property request" broadcast from the public landing
 * page. It lives in the global top-level `lead_requests` collection and is
 * visible to every signed-up company. Each company can independently move it
 * into its own leads (shared-claim model) — tracked per company in `claimedBy`.
 */
export interface LeadRequest {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  preferredContactMethod?: "phone" | "whatsapp" | "email" | null;
  requirement?: LeadRequirement | null;
  source: "landing_request";
  status: "new";
  /** Keyed by companyId — present once that company has moved it to its leads. */
  claimedBy?: Record<string, LeadRequestClaim>;
  createdAt: Timestamp | Date | string | null;
  updatedAt: Timestamp | Date | string | null;
}
