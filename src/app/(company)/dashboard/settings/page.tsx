import { redirect } from "next/navigation";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import {
  DashboardSettingsClient,
  type SettingsFormData,
  type LeadAssignStrategy,
} from "@/features/settings/DashboardSettingsClient";
import { requireCompanyMember } from "@/lib/auth/guards";
import { limitsForPlan } from "@/constants/plans";
import type { SubscriptionPlanId } from "@/types/company";
import { adminDb } from "@/lib/firebase/admin";
import {
  PersonalInfoSection,
  type PersonalInfo,
} from "@/features/settings/PersonalInfoSection";

export const metadata = {
  title: "الإعدادات",
};

export default async function DashboardSettingsPage() {
  const user = await requireCompanyMember();

  if (!user.companyId) {
    redirect(ROUTES.DASHBOARD);
  }

  const canManageBranding = hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_BRANDING,
  ]);

  const canManageOperational = hasAnyPermission(user.permissions, [
    PERMISSIONS.COMPANY_SETTINGS_ACCESS,
  ]);

  // Every member reaches settings to see their personal info + reset password;
  // only managers see the company-wide settings below.
  const canAccessCompanySettings = canManageBranding || canManageOperational;

  const [companySnap, settingsSnap, employeeSnap] = await Promise.all([
    adminDb().doc(`companies/${user.companyId}`).get(),
    adminDb().doc(`companies/${user.companyId}/settings/default`).get(),
    adminDb().doc(`companies/${user.companyId}/employees/${user.uid}`).get(),
  ]);

  if (!companySnap.exists) {
    redirect(ROUTES.DASHBOARD);
  }

  const company = companySnap.data() as Record<string, unknown>;
  const settings = settingsSnap.exists
    ? (settingsSnap.data() as Record<string, unknown>)
    : {};

  const employee = employeeSnap.exists
    ? (employeeSnap.data() as Record<string, unknown>)
    : {};

  // Access is granted through permission groups, so show the assigned group
  // names rather than the internal role.
  const groupIds = Array.isArray(employee.permissionGroupIds)
    ? employee.permissionGroupIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  let permissionGroups = "—";
  if (groupIds.length > 0) {
    const groupSnaps = await adminDb().getAll(
      ...groupIds.map((id) =>
        adminDb().doc(`companies/${user.companyId}/permission_groups/${id}`),
      ),
    );
    const names = groupSnaps
      .filter((snap) => snap.exists && snap.get("active") !== false)
      .map((snap) => {
        const nameAr = snap.get("nameAr");
        const nameEn = snap.get("nameEn");
        if (typeof nameAr === "string" && nameAr) return nameAr;
        if (typeof nameEn === "string" && nameEn) return nameEn;
        return snap.id;
      });
    if (names.length > 0) permissionGroups = names.join("، ");
  }

  const personalInfo: PersonalInfo = {
    name:
      typeof employee.name === "string" && employee.name
        ? employee.name
        : (user.email?.split("@")[0] ?? "—"),
    email:
      (typeof employee.email === "string" && employee.email) ||
      user.email ||
      "—",
    permissionGroups,
    phone: typeof employee.phone === "string" ? employee.phone : null,
    nationalId:
      typeof employee.nationalId === "string" ? employee.nationalId : null,
    department:
      typeof employee.department === "string" ? employee.department : null,
    title: typeof employee.title === "string" ? employee.title : null,
    passwordResetRequired: employee.passwordResetRequired === true,
  };

  const contact =
    typeof company.contact === "object" && company.contact !== null
      ? (company.contact as Record<string, unknown>)
      : {};

  const theme =
    typeof company.theme === "object" && company.theme !== null
      ? (company.theme as Record<string, unknown>)
      : {};

  const primaryColor =
    typeof theme.primaryColor === "string"
      ? theme.primaryColor
      : typeof company["theme.primaryColor"] === "string"
        ? (company["theme.primaryColor"] as string)
        : "#0f6d45";
  const secondaryColor =
    typeof theme.secondaryColor === "string"
      ? theme.secondaryColor
      : typeof company["theme.secondaryColor"] === "string"
        ? (company["theme.secondaryColor"] as string)
        : "#e8d9bf";
  const accentColor =
    typeof theme.accentColor === "string"
      ? theme.accentColor
      : typeof company["theme.accentColor"] === "string"
        ? (company["theme.accentColor"] as string)
        : "#11935d";

  const planId: SubscriptionPlanId =
    company.subscriptionPlan === "starter" ||
    company.subscriptionPlan === "pro" ||
    company.subscriptionPlan === "enterprise"
      ? company.subscriptionPlan
      : "free";

  const limits = limitsForPlan(planId);

  const planUsage = {
    planId,
    employees: {
      used:
        typeof company.activeEmployeesCount === "number"
          ? company.activeEmployeesCount
          : 0,
      limit: limits.maxEmployees,
    },
    listings: {
      used:
        typeof company.listingsCount === "number" ? company.listingsCount : 0,
      limit: limits.maxListings,
    },
  };

  const initialSettings: SettingsFormData = {
    name: typeof company.name === "string" ? company.name : "",
    description:
      typeof company.description === "string" ? company.description : "",
    logo: typeof company.logo === "string" ? company.logo : "",
    contact: {
      phone: typeof contact.phone === "string" ? contact.phone : "",
      whatsapp: typeof contact.whatsapp === "string" ? contact.whatsapp : "",
      email: typeof contact.email === "string" ? contact.email : "",
    },
    theme: {
      primaryColor,
      secondaryColor,
      accentColor,
      darkMode: Boolean(theme.darkMode),
    },
    leadAutoAssignStrategy: (settings.leadAutoAssignStrategy === "least_busy" ||
    settings.leadAutoAssignStrategy === "manual"
      ? settings.leadAutoAssignStrategy
      : "round_robin") as LeadAssignStrategy,
    taskEscalationHours:
      typeof settings.taskEscalationHours === "number"
        ? settings.taskEscalationHours
        : 24,
    notificationEmails: Array.isArray(settings.notificationEmails)
      ? settings.notificationEmails
          .filter((entry): entry is string => typeof entry === "string")
          .join(", ")
      : "",
    contactPhonesVisibility:
      typeof settings.visibility === "object" &&
      settings.visibility !== null &&
      (settings.visibility as Record<string, unknown>).contactPhones ===
        "restricted"
        ? "restricted"
        : "everyone",
    leadsVisibility:
      typeof settings.visibility === "object" &&
      settings.visibility !== null &&
      (settings.visibility as Record<string, unknown>).leads === "assigned_only"
        ? "assigned_only"
        : "all",
  };

  return (
    <div className="space-y-6">
      <PersonalInfoSection info={personalInfo} />
      {canAccessCompanySettings && (
        <DashboardSettingsClient
          companyId={user.companyId}
          canManageBranding={canManageBranding}
          canManageOperational={canManageOperational}
          initialSettings={initialSettings}
          planUsage={planUsage}
        />
      )}
    </div>
  );
}
