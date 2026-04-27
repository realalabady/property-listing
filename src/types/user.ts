import type { Timestamp } from "firebase/firestore";
import type { Role } from "@/constants/roles";
import type { Permission } from "@/constants/permissions";

/**
 * AuthUser = client-side representation of an authenticated user.
 * Mirrors the custom claims set on the Firebase Auth token.
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  role: Role | null;
  companyId: string | null;
  permissions: Permission[];
}

export interface EmployeeKPIMetrics {
  listingsCreated: number;
  listingsActive: number;
  callsMade: number;
  leadsAssigned: number;
  leadsConverted: number;
  dealsClosed: number;
  avgResponseMinutes: number;
  tasksCompleted: number;
  tasksOverdue: number;
  lastUpdatedAt?: Timestamp | Date;
}

export interface Employee {
  id: string; // == firebase auth uid
  companyId: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: Role;
  permissions: Permission[]; // may include custom overrides beyond role defaults
  active: boolean;
  department?: string;
  title?: string;
  kpi: EmployeeKPIMetrics;
  invitedBy?: string;
  invitedAt?: Timestamp | Date;
  joinedAt?: Timestamp | Date;
  lastActiveAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Invitation {
  id: string;
  companyId: string;
  email: string;
  role: Role;
  permissions?: Permission[];
  invitedBy: string;
  token: string; // one-time token
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: Timestamp | Date;
  createdAt: Timestamp | Date;
}
