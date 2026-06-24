import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { normalizeHexColor } from "@/lib/utils/color";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

interface UpdateSettingsBody {
  name?: string;
  description?: string;
  logo?: string;
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
  };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    darkMode?: boolean;
  };
  leadAutoAssignStrategy?: "round_robin" | "least_busy" | "manual";
  taskEscalationHours?: number;
  notificationEmails?: string[];
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.replace(/\s+/g, " ").trim();
  return next.length > 0 ? next : "";
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim().toLowerCase();
  if (!next) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) ? next : null;
}

function canAccessCompanySettings(
  user: Awaited<ReturnType<typeof getSessionUser>>,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [
    PERMISSIONS.COMPANY_SETTINGS_ACCESS,
    PERMISSIONS.MANAGE_BRANDING,
  ]);
}

function canManageBranding(
  user: Awaited<ReturnType<typeof getSessionUser>>,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;
  return hasAnyPermission(user.permissions, [PERMISSIONS.MANAGE_BRANDING]);
}

function canManageOperationalSettings(
  user: Awaited<ReturnType<typeof getSessionUser>>,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;

  return hasAnyPermission(user.permissions, [
    PERMISSIONS.COMPANY_SETTINGS_ACCESS,
  ]);
}

function pickThemeColor(
  company: Record<string, unknown>,
  theme: Record<string, unknown>,
  key: "primaryColor" | "secondaryColor" | "accentColor",
  fallback: string,
): string {
  const nested = theme[key];
  if (typeof nested === "string") return nested;

  const legacy = company[`theme.${key}`];
  if (typeof legacy === "string") return legacy;

  return fallback;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canAccessCompanySettings(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [companySnap, settingsSnap] = await Promise.all([
    adminDb().doc(`companies/${companyId}`).get(),
    adminDb().doc(`companies/${companyId}/settings/default`).get(),
  ]);

  if (!companySnap.exists) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
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

  return NextResponse.json({
    settings: {
      companyId,
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
        primaryColor: pickThemeColor(company, theme, "primaryColor", "#0f6d45"),
        secondaryColor: pickThemeColor(
          company,
          theme,
          "secondaryColor",
          "#e8d9bf",
        ),
        accentColor: pickThemeColor(company, theme, "accentColor", "#11935d"),
        darkMode: Boolean(theme.darkMode),
      },
      leadAutoAssignStrategy:
        settings.leadAutoAssignStrategy === "least_busy" ||
        settings.leadAutoAssignStrategy === "manual"
          ? settings.leadAutoAssignStrategy
          : "round_robin",
      taskEscalationHours:
        typeof settings.taskEscalationHours === "number"
          ? settings.taskEscalationHours
          : 24,
      notificationEmails: Array.isArray(settings.notificationEmails)
        ? settings.notificationEmails.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : [],
    },
  });
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canAccessCompanySettings(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as UpdateSettingsBody;

  const brandingUpdate: Record<string, unknown> = {};
  const operationalUpdate: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = normalizeText(body.name);
    if (name.length < 2 || name.length > 120) {
      return NextResponse.json(
        { error: "Company name must be between 2 and 120 characters." },
        { status: 400 },
      );
    }
    brandingUpdate.name = name;
  }

  if (body.description !== undefined) {
    const description = normalizeText(body.description);
    if (description.length > 1000) {
      return NextResponse.json(
        { error: "Description is too long." },
        { status: 400 },
      );
    }
    brandingUpdate.description = description;
  }

  if (body.logo !== undefined) {
    const logo = normalizeNullableText(body.logo);
    if (logo === null || logo.length > 2048) {
      return NextResponse.json(
        { error: "Logo URL is invalid." },
        { status: 400 },
      );
    }
    brandingUpdate.logo = logo;
  }

  if (body.contact) {
    const phone = normalizeNullableText(body.contact.phone);
    const whatsapp = normalizeNullableText(body.contact.whatsapp);
    const email = normalizeEmail(body.contact.email);

    if (email === null) {
      return NextResponse.json(
        { error: "Contact email is invalid." },
        { status: 400 },
      );
    }

    if (phone !== null) brandingUpdate["contact.phone"] = phone;
    if (whatsapp !== null) brandingUpdate["contact.whatsapp"] = whatsapp;
    if (email !== null) brandingUpdate["contact.email"] = email;
  }

  if (body.theme) {
    if (body.theme.primaryColor !== undefined) {
      const primaryColor = normalizeHexColor(body.theme.primaryColor);
      if (!primaryColor) {
        return NextResponse.json(
          { error: "Primary color must be a valid hex color (e.g., #0f6d45)." },
          { status: 400 },
        );
      }
      brandingUpdate["theme.primaryColor"] = primaryColor;
    }

    if (body.theme.secondaryColor !== undefined) {
      const secondaryColor = normalizeHexColor(body.theme.secondaryColor);
      if (!secondaryColor) {
        return NextResponse.json(
          { error: "Secondary color must be a valid hex color." },
          { status: 400 },
        );
      }
      brandingUpdate["theme.secondaryColor"] = secondaryColor;
    }

    if (body.theme.accentColor !== undefined) {
      const accentColor = normalizeHexColor(body.theme.accentColor);
      if (!accentColor) {
        return NextResponse.json(
          { error: "Accent color must be a valid hex color." },
          { status: 400 },
        );
      }
      brandingUpdate["theme.accentColor"] = accentColor;
    }

    if (typeof body.theme.darkMode === "boolean") {
      brandingUpdate["theme.darkMode"] = body.theme.darkMode;
    }
  }

  if (body.leadAutoAssignStrategy !== undefined) {
    if (
      body.leadAutoAssignStrategy !== "round_robin" &&
      body.leadAutoAssignStrategy !== "least_busy" &&
      body.leadAutoAssignStrategy !== "manual"
    ) {
      return NextResponse.json(
        { error: "leadAutoAssignStrategy is invalid." },
        { status: 400 },
      );
    }

    operationalUpdate.leadAutoAssignStrategy = body.leadAutoAssignStrategy;
  }

  if (body.taskEscalationHours !== undefined) {
    const hours = Number(body.taskEscalationHours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
      return NextResponse.json(
        { error: "taskEscalationHours must be an integer between 1 and 168." },
        { status: 400 },
      );
    }

    operationalUpdate.taskEscalationHours = hours;
  }

  if (body.notificationEmails !== undefined) {
    if (!Array.isArray(body.notificationEmails)) {
      return NextResponse.json(
        { error: "notificationEmails must be an array." },
        { status: 400 },
      );
    }

    const cleaned = body.notificationEmails
      .map((email) => normalizeEmail(email))
      .filter(
        (email): email is string =>
          typeof email === "string" && email.length > 0,
      );

    const hasInvalid = body.notificationEmails.some(
      (email) => normalizeEmail(email) === null,
    );
    if (hasInvalid) {
      return NextResponse.json(
        { error: "notificationEmails contains an invalid email." },
        { status: 400 },
      );
    }

    operationalUpdate.notificationEmails = Array.from(new Set(cleaned));
  }

  const hasBrandingChanges = Object.keys(brandingUpdate).length > 0;
  const hasOperationalChanges = Object.keys(operationalUpdate).length > 0;

  if (!hasBrandingChanges && !hasOperationalChanges) {
    return NextResponse.json(
      { error: "No valid settings changes were provided." },
      { status: 400 },
    );
  }

  if (hasBrandingChanges && !canManageBranding(user, companyId)) {
    return NextResponse.json(
      { error: "Missing permission to update branding settings." },
      { status: 403 },
    );
  }

  if (hasOperationalChanges && !canManageOperationalSettings(user, companyId)) {
    return NextResponse.json(
      { error: "Missing permission to update operational settings." },
      { status: 403 },
    );
  }

  const updates: Promise<unknown>[] = [];

  if (hasBrandingChanges) {
    updates.push(
      adminDb()
        .doc(`companies/${companyId}`)
        .update({
          ...brandingUpdate,
          updatedAt: FieldValue.serverTimestamp(),
        }),
    );
  }

  if (hasOperationalChanges) {
    updates.push(
      adminDb()
        .doc(`companies/${companyId}/settings/default`)
        .set(
          {
            ...operationalUpdate,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
    );
  }

  await Promise.all(updates);

  return NextResponse.json({
    ok: true,
    updated: {
      branding: hasBrandingChanges,
      operational: hasOperationalChanges,
    },
  });
}
