import { redirect } from "next/navigation";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import {
  DashboardSettingsClient,
  type SettingsFormData,
  type LeadAssignStrategy,
} from "@/features/settings/DashboardSettingsClient";
import { requireCompanyMember } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";

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

  if (!canManageBranding && !canManageOperational) {
    redirect(ROUTES.DASHBOARD);
  }

  const [companySnap, settingsSnap] = await Promise.all([
    adminDb().doc(`companies/${user.companyId}`).get(),
    adminDb().doc(`companies/${user.companyId}/settings/default`).get(),
  ]);

  if (!companySnap.exists) {
    redirect(ROUTES.DASHBOARD);
  }

  const company = companySnap.data() as Record<string, unknown>;
  const settings = settingsSnap.exists
    ? (settingsSnap.data() as Record<string, unknown>)
    : {};

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
  };

  return (
    <DashboardSettingsClient
      companyId={user.companyId}
      canManageBranding={canManageBranding}
      canManageOperational={canManageOperational}
      initialSettings={initialSettings}
    />
  );
}
