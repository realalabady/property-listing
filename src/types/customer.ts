import type { Timestamp } from "firebase/firestore";

/**
 * A self-registered marketplace customer (role: "customer").
 * Stored at `customers/{uid}` where uid is the Firebase Auth uid.
 */
export interface CustomerProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  preferredContactMethod: "phone" | "whatsapp" | "email" | null;
  /**
   * Whether the customer agreed to let agencies contact them about matching
   * properties. Only consenting customers are surfaced as matched leads.
   */
  contactConsent: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
