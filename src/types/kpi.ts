import type { Timestamp } from "firebase/firestore";

/**
 * Monthly KPI snapshot per employee — computed by Cloud Function cron.
 * Document ID: companies/{cid}/kpi_snapshots/{YYYY-MM}_{employeeId}
 */
export interface EmployeeKPISnapshot {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  period: string; // "YYYY-MM"

  listingsCreated: number;
  listingsActive: number;
  leadsAssigned: number;
  leadsConverted: number;
  conversionRate: number; // 0-1
  dealsClosed: number;
  revenueGenerated: number;
  avgResponseMinutes: number;
  tasksCompleted: number;
  tasksOverdue: number;
  callsMade: number;

  rank?: number; // ranking within company that month
  score?: number; // composite score
  createdAt: Timestamp | Date;
}

export interface CompanyKPIOverview {
  companyId: string;
  period: string; // "YYYY-MM"
  totalListings: number;
  activeListings: number;
  totalLeads: number;
  newLeadsThisMonth: number;
  convertedLeads: number;
  totalRevenue: number;
  totalEmployees: number;
  avgResponseMinutes: number;
  topPerformerId?: string;
  topPerformerName?: string;
  updatedAt: Timestamp | Date;
}
