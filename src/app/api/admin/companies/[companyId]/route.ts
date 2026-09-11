import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getSessionUser } from "@/lib/auth/session";
import { sendCompanyActivatedEmail } from "@/lib/email/accounts";
import type { EmailResult } from "@/lib/email/send";
import { resolveAppBaseUrl } from "@/lib/url/app-base-url";
import { adminDb } from "@/lib/firebase/admin";
import type { CompanyStatus } from "@/types/company";
import { normalizePlanId } from "@/constants/plans";
import { getPlan, getPlans } from "@/lib/plans/catalog";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

type CompanyAction =
  | "suspend"
  | "activate"
  | "soft_delete"
  | "restore"
  | "set_plan"
  | "set_trial";

interface CompanyActionBody {
  action?: CompanyAction;
  plan?: unknown;
  reason?: unknown;
  trialEndsAt?: unknown;
  trialDays?: unknown;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function parseCompanyStatus(value: unknown): CompanyStatus {
  const normalized = normalizeText(value);
  if (
    normalized === "active" ||
    normalized === "suspended" ||
    normalized === "trial" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }
  return "trial";
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function serializeDate(value: unknown): string | null {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const companyRef = adminDb().doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const [kpiSnap, ownersSnap, employeesAgg, listingsAgg, leadsAgg] =
    await Promise.all([
      adminDb().doc(`companies/${companyId}/kpi/current`).get(),
      adminDb()
        .collection(`companies/${companyId}/employees`)
        .where("role", "==", ROLES.COMPANY_OWNER)
        .where("active", "==", true)
        .limit(2)
        .get(),
      adminDb()
        .collection(`companies/${companyId}/employees`)
        .where("active", "==", true)
        .count()
        .get(),
      adminDb().collection(`companies/${companyId}/listings`).count().get(),
      adminDb().collection(`companies/${companyId}/leads`).count().get(),
    ]);

  const company = companySnap.data() as Record<string, unknown>;
  const kpi = kpiSnap.exists
    ? (kpiSnap.data() as Record<string, unknown>)
    : ({} as Record<string, unknown>);

  const ownerDoc = ownersSnap.docs[0];
  const owner = ownerDoc
    ? {
        uid: ownerDoc.id,
        email:
          typeof ownerDoc.get("email") === "string"
            ? (ownerDoc.get("email") as string)
            : "",
        name:
          typeof ownerDoc.get("name") === "string"
            ? (ownerDoc.get("name") as string)
            : "Owner",
        lastSignInAt: serializeDate(ownerDoc.get("lastSignInAt")),
      }
    : null;

  const totalLeads = asNumber(kpi.totalLeads) || leadsAgg.data().count;
  const convertedLeads = asNumber(kpi.convertedLeads);
  const leadConversionRate =
    totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 10000) / 100
      : 0;

  return NextResponse.json({
    company: {
      id: companySnap.id,
      name: typeof company.name === "string" ? company.name : "Untitled",
      slug: typeof company.slug === "string" ? company.slug : "",
      status: parseCompanyStatus(company.status),
      subscriptionPlan: (await getPlan(company.subscriptionPlan)).id,
      ownerId: typeof company.ownerId === "string" ? company.ownerId : null,
      description:
        typeof company.description === "string" ? company.description : "",
      lastSignInAt: serializeDate(company.lastSignInAt),
      lastSignInBy:
        typeof company.lastSignInBy === "string" ? company.lastSignInBy : null,
      createdAt: serializeDate(company.createdAt),
      updatedAt: serializeDate(company.updatedAt),
      deletedAt: serializeDate(company.deletedAt),
      isDeleted: company.isDeleted === true,
      suspendedAt: serializeDate(company.suspendedAt),
      owner,
      metrics: {
        activeEmployees: employeesAgg.data().count,
        listingsUploaded:
          asNumber(kpi.totalListings) > 0
            ? asNumber(kpi.totalListings)
            : listingsAgg.data().count,
        leadsTotal: totalLeads,
        leadsConverted: convertedLeads,
        leadConversionRate,
      },
    },
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as CompanyActionBody;
  const action = body.action;

  const companyRef = adminDb().doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  switch (action) {
    case "suspend": {
      updates.status = "suspended";
      updates.suspendedAt = FieldValue.serverTimestamp();
      updates.suspendedBy = user.uid;
      break;
    }
    case "activate": {
      updates.status = "active";
      updates.reactivatedAt = FieldValue.serverTimestamp();
      updates.reactivatedBy = user.uid;
      updates.suspendedAt = FieldValue.delete();
      updates.suspendedBy = FieldValue.delete();
      break;
    }
    case "soft_delete": {
      const reason = normalizeText(body.reason);
      updates.status = "cancelled";
      updates.isDeleted = true;
      updates.deletedAt = FieldValue.serverTimestamp();
      updates.deletedBy = user.uid;
      updates.deleteReason = reason || "deleted_by_super_admin";
      break;
    }
    case "restore": {
      updates.status = "active";
      updates.isDeleted = false;
      updates.deletedAt = FieldValue.delete();
      updates.deletedBy = FieldValue.delete();
      updates.deleteReason = FieldValue.delete();
      updates.restoredAt = FieldValue.serverTimestamp();
      updates.restoredBy = user.uid;
      break;
    }
    case "set_plan": {
      const planId = normalizePlanId(body.plan);
      const plan = (await getPlans()).find((p) => p.id === planId);
      if (!plan) {
        return NextResponse.json(
          { error: "A valid subscription plan is required." },
          { status: 400 },
        );
      }
      updates.subscriptionPlan = plan.id;
      updates.limits = {
        maxListings: plan.maxListings,
        maxEmployees: plan.maxEmployees,
      };
      break;
    }
    case "set_trial": {
      // Accept an explicit end date (ISO) or a number of days from now.
      let endDate: Date | null = null;
      if (typeof body.trialEndsAt === "string" && body.trialEndsAt.trim()) {
        const parsed = new Date(body.trialEndsAt);
        if (!Number.isNaN(parsed.getTime())) endDate = parsed;
      }
      if (!endDate) {
        const days = Math.round(Number(body.trialDays));
        const clamped =
          Number.isFinite(days) && days > 0
            ? Math.min(Math.max(days, 1), 365)
            : 14;
        endDate = new Date(Date.now() + clamped * 24 * 60 * 60 * 1000);
      }
      updates.status = "trial";
      updates.trialEndsAt = Timestamp.fromDate(endDate);
      updates.trialExpiredAt = FieldValue.delete();
      updates.suspendedAt = FieldValue.delete();
      updates.suspendedBy = FieldValue.delete();
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  await companyRef.update(updates);

  // Tell the owner their workspace is live. Best-effort: a mail failure must
  // not undo an activation that already succeeded.
  let activationEmail: EmailResult | null = null;
  if (action === "activate" || action === "restore") {
    activationEmail = await notifyOwnerOfActivation(
      req,
      companyId,
      companySnap.data() as Record<string, unknown>,
    );
  }

  return NextResponse.json({
    ok: true,
    action,
    ...(activationEmail
      ? {
          ownerEmailSent: activationEmail.sent,
          ownerEmailSkipped: activationEmail.skipped,
          ...(activationEmail.reason
            ? { ownerEmailReason: activationEmail.reason }
            : {}),
        }
      : {}),
  });
}

/**
 * Emails the company owner that the workspace is active.
 *
 * A company can be activated before an owner is ever assigned (`ownerId`
 * defaults to ""), so a missing owner is a skip, not an error.
 */
async function notifyOwnerOfActivation(
  req: NextRequest,
  companyId: string,
  companyData: Record<string, unknown>,
): Promise<EmailResult> {
  const ownerId =
    typeof companyData.ownerId === "string" ? companyData.ownerId.trim() : "";
  if (!ownerId) {
    return { sent: false, skipped: true, reason: "NO_OWNER_ASSIGNED" };
  }

  const ownerSnap = await adminDb()
    .doc(`companies/${companyId}/employees/${ownerId}`)
    .get();

  const ownerEmail =
    typeof ownerSnap.get("email") === "string"
      ? (ownerSnap.get("email") as string)
      : "";
  if (!ownerEmail) {
    return { sent: false, skipped: true, reason: "NO_OWNER_EMAIL" };
  }

  const appBaseUrl = resolveAppBaseUrl(req);

  return sendCompanyActivatedEmail({
    to: ownerEmail,
    name:
      typeof ownerSnap.get("name") === "string"
        ? (ownerSnap.get("name") as string)
        : null,
    companyName:
      typeof companyData.name === "string" && companyData.name.trim()
        ? companyData.name
        : "شركتك",
    loginUrl: `${appBaseUrl}${ROUTES.LOGIN}`,
  });
}
