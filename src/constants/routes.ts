/**
 * Centralized route definitions for type-safe navigation.
 */
export const ROUTES = {
  // Public
  HOME: "/",
  MARKETPLACE: "/properties",
  MARKETPLACE_LISTING: (id: string) => `/properties/${id}`,

  // Company public
  COMPANY_LANDING: (slug: string) => `/c/${slug}`,
  COMPANY_PROPERTIES: (slug: string) => `/c/${slug}/properties`,
  COMPANY_LISTING: (slug: string, id: string) => `/c/${slug}/properties/${id}`,
  COMPANY_CONTACT: (slug: string) => `/c/${slug}/contact`,

  // Auth
  LOGIN: "/login",
  SIGNUP: "/signup",
  ONBOARDING: "/onboarding",

  // Dashboard
  DASHBOARD: "/dashboard",
  DASHBOARD_LISTINGS: "/dashboard/listings",
  DASHBOARD_LISTING_NEW: "/dashboard/listings/new",
  DASHBOARD_LISTING_EDIT: (id: string) => `/dashboard/listings/${id}/edit`,
  DASHBOARD_LEADS: "/dashboard/leads",
  DASHBOARD_EMPLOYEES: "/dashboard/employees",
  DASHBOARD_TASKS: "/dashboard/tasks",
  DASHBOARD_KPI: "/dashboard/kpi",
  DASHBOARD_SETTINGS: "/dashboard/settings",

  // Admin
  ADMIN: "/admin",
  ADMIN_COMPANIES: "/admin/companies",
  ADMIN_BILLING: "/admin/billing",
  ADMIN_ANALYTICS: "/admin/analytics",
} as const;

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/onboarding",
] as const;
export const AUTH_PREFIXES = ["/login", "/signup"] as const;
