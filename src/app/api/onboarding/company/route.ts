import { NextResponse, type NextRequest } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getSessionUser } from "@/lib/auth/session";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { ROLES } from "@/constants/roles";
import { ROLE_PERMISSIONS } from "@/constants/permissions";

export const runtime = "nodejs";

interface OnboardingBody {
  companyName?: string;
  ownerName?: string;
  phone?: string | null;
}

function normalizeCompanyName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalizeOwnerName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
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

function fallbackOwnerName(email: string | undefined): string {
  if (!email) return "Company Owner";

  const local = email.split("@")[0] || "";
  const cleaned = local
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Company Owner";
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    const isPublicOnboardingEnabled =
      process.env.ALLOW_PUBLIC_ONBOARDING === "true";
    if (!isPublicOnboardingEnabled) {
      return NextResponse.json(
        {
          error:
            "Self-service onboarding is disabled. Ask the platform owner to provision your account.",
        },
        { status: 403 },
      );
    }

    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
    }

    if (sessionUser.role === ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Super admin users do not need company onboarding." },
        { status: 403 },
      );
    }

    const body = (await req.json()) as OnboardingBody;
    const companyName = normalizeCompanyName(body.companyName);
    const ownerName =
      normalizeOwnerName(body.ownerName) ||
      fallbackOwnerName(sessionUser.email);
    const phone = normalizePhone(body.phone);

    if (!companyName || companyName.length < 2) {
      return NextResponse.json(
        { error: "Company name must be at least 2 characters." },
        { status: 400 },
      );
    }

    const companiesRef = adminDb().collection("companies");
    const existingOwnedCompany = await companiesRef
      .where("ownerId", "==", sessionUser.uid)
      .limit(1)
      .get();

    const permissions = ROLE_PERMISSIONS[ROLES.COMPANY_OWNER];

    let companyId: string;
    let slug: string;

    if (!existingOwnedCompany.empty) {
      const existingDoc = existingOwnedCompany.docs[0]!;
      companyId = existingDoc.id;
      slug =
        typeof existingDoc.get("slug") === "string"
          ? (existingDoc.get("slug") as string)
          : await ensureUniqueSlug(slugify(companyName));

      const existingUpdate: Record<string, unknown> = {
        name: companyName,
        ownerId: sessionUser.uid,
        slug,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (phone) {
        existingUpdate["contact.phone"] = phone;
      }

      await existingDoc.ref.update(existingUpdate);
    } else {
      slug = await ensureUniqueSlug(slugify(companyName));
      const companyRef = companiesRef.doc();
      companyId = companyRef.id;

      const trialEndsAt = Timestamp.fromDate(
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      );

      await companyRef.set({
        name: companyName,
        slug,
        description: "",
        logo: "",
        theme: {
          primaryColor: "#0f6d45",
          secondaryColor: "#e8d9bf",
          accentColor: "#11935d",
          darkMode: false,
        },
        subscriptionPlan: "starter",
        ownerId: sessionUser.uid,
        status: "trial",
        contact: {
          email: sessionUser.email || "",
          ...(phone ? { phone } : {}),
        },
        supportedLanguages: ["en", "ar"],
        defaultLanguage: "en",
        listingsCount: 0,
        activeEmployeesCount: 1,
        trialEndsAt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await adminDb()
      .doc(`companies/${companyId}/settings/default`)
      .set(
        {
          companyId,
          leadAutoAssign: true,
          leadAutoAssignStrategy: "round_robin",
          taskEscalationHours: 24,
          notificationEmails: sessionUser.email ? [sessionUser.email] : [],
          integrations: {},
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await adminDb()
      .doc(`companies/${companyId}/employees/${sessionUser.uid}`)
      .set(
        {
          companyId,
          email: sessionUser.email || "",
          name: ownerName,
          ...(phone ? { phone } : {}),
          role: ROLES.COMPANY_OWNER,
          permissions,
          active: true,
          title: "Owner",
          kpi: {
            listingsCreated: 0,
            listingsActive: 0,
            callsMade: 0,
            leadsAssigned: 0,
            leadsConverted: 0,
            dealsClosed: 0,
            avgResponseMinutes: 0,
            tasksCompleted: 0,
            tasksOverdue: 0,
          },
          joinedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await adminAuth().setCustomUserClaims(sessionUser.uid, {
      role: ROLES.COMPANY_OWNER,
      companyId,
      permissions,
    });

    return NextResponse.json({
      ok: true,
      companyId,
      slug,
      role: ROLES.COMPANY_OWNER,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const detail = process.env.NODE_ENV === "production" ? undefined : message;

    return NextResponse.json(
      {
        code: "ONBOARDING_FAILED",
        error: "Failed to complete onboarding.",
        ...(detail ? { detail } : {}),
      },
      { status: 500 },
    );
  }
}
