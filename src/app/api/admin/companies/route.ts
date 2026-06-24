import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import type { CompanyStatus, SubscriptionPlanId } from "@/types/company";

export const runtime = "nodejs";

interface CreateCompanyBody {
  name?: string;
  slug?: string;
  description?: string;
  subscriptionPlan?: unknown;
  status?: unknown;
  contactEmail?: string;
  contactPhone?: string;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalizeOptionalText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return base || "company";
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const companiesRef = adminDb().collection("companies");
  let candidate = baseSlug;

  for (let i = 0; i < 50; i += 1) {
    const snap = await companiesRef
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    if (snap.empty) return candidate;
    candidate = `${baseSlug}-${i + 2}`;
  }

  return `${baseSlug}-${Date.now().toString().slice(-6)}`;
}

function parseSubscriptionPlan(value: unknown): SubscriptionPlanId {
  const normalized = normalizeText(value);
  if (
    normalized === "free" ||
    normalized === "starter" ||
    normalized === "pro" ||
    normalized === "enterprise"
  ) {
    return normalized;
  }
  return "starter";
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

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "1";

  const companiesSnap = await adminDb()
    .collection("companies")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const companiesRaw = await Promise.all(
    companiesSnap.docs.map(async (doc) => {
      const data = doc.data() as Record<string, unknown>;
      const status = parseCompanyStatus(data.status);
      const isDeleted = Boolean(data.deletedAt) || data.isDeleted === true;

      if (!includeDeleted && (isDeleted || status === "cancelled")) {
        return null;
      }

      const kpiSnap = await adminDb()
        .doc(`companies/${doc.id}/kpi/current`)
        .get();
      const kpi = kpiSnap.exists
        ? (kpiSnap.data() as Record<string, unknown>)
        : ({} as Record<string, unknown>);

      const totalLeads = asNumber(kpi.totalLeads);
      const convertedLeads = asNumber(kpi.convertedLeads);
      const leadConversionRate =
        totalLeads > 0
          ? Math.round((convertedLeads / totalLeads) * 10000) / 100
          : 0;

      return {
        id: doc.id,
        name: typeof data.name === "string" ? data.name : "Untitled company",
        slug: typeof data.slug === "string" ? data.slug : "",
        subscriptionPlan: parseSubscriptionPlan(data.subscriptionPlan),
        status,
        ownerId: typeof data.ownerId === "string" ? data.ownerId : null,
        isDeleted,
        createdAt: serializeDate(data.createdAt),
        updatedAt: serializeDate(data.updatedAt),
        deletedAt: serializeDate(data.deletedAt),
        lastSignInAt: serializeDate(data.lastSignInAt),
        lastSignInBy:
          typeof data.lastSignInBy === "string" ? data.lastSignInBy : null,
        metrics: {
          activeEmployees:
            asNumber(kpi.totalEmployees) ||
            (typeof data.activeEmployeesCount === "number"
              ? data.activeEmployeesCount
              : 0),
          listingsUploaded:
            asNumber(kpi.totalListings) ||
            (typeof data.listingsCount === "number" ? data.listingsCount : 0),
          leadsTotal: totalLeads,
          leadsConverted: convertedLeads,
          leadConversionRate,
        },
      };
    }),
  );

  const companies = companiesRaw.filter(
    (company): company is NonNullable<(typeof companiesRaw)[number]> =>
      company !== null,
  );

  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as CreateCompanyBody;

  const companyName = normalizeText(body.name);
  if (companyName.length < 2) {
    return NextResponse.json(
      { error: "Company name must be at least 2 characters." },
      { status: 400 },
    );
  }

  const slugInput = normalizeText(body.slug);
  const slug = await ensureUniqueSlug(slugify(slugInput || companyName));
  const subscriptionPlan = parseSubscriptionPlan(body.subscriptionPlan);
  const status = parseCompanyStatus(body.status);
  const description = normalizeOptionalText(body.description) ?? "";
  const contactEmail = normalizeOptionalText(body.contactEmail);
  const contactPhone = normalizeOptionalText(body.contactPhone);

  const companyRef = adminDb().collection("companies").doc();
  const trialEndsAt =
    status === "trial"
      ? Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
      : null;

  await companyRef.set({
    name: companyName,
    slug,
    description,
    logo: "",
    theme: {
      primaryColor: "#0f6d45",
      secondaryColor: "#e8d9bf",
      accentColor: "#11935d",
      darkMode: false,
    },
    subscriptionPlan,
    ownerId: "",
    status,
    contact: {
      ...(contactEmail ? { email: contactEmail } : {}),
      ...(contactPhone ? { phone: contactPhone } : {}),
    },
    supportedLanguages: ["en", "ar"],
    defaultLanguage: "en",
    listingsCount: 0,
    activeEmployeesCount: 0,
    ...(trialEndsAt ? { trialEndsAt } : {}),
    isDeleted: false,
    createdBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await adminDb()
    .doc(`companies/${companyRef.id}/settings/default`)
    .set(
      {
        companyId: companyRef.id,
        leadAutoAssign: true,
        leadAutoAssignStrategy: "round_robin",
        taskEscalationHours: 24,
        notificationEmails: contactEmail ? [contactEmail] : [],
        integrations: {},
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return NextResponse.json(
    {
      ok: true,
      company: {
        id: companyRef.id,
        name: companyName,
        slug,
        subscriptionPlan,
        status,
      },
    },
    { status: 201 },
  );
}
