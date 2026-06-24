import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import {
  LEAD_STATUSES,
  LISTING_CATEGORIES,
  type LeadStatus,
} from "@/constants/listing-categories";
import { getSessionUser } from "@/lib/auth/session";
import {
  canAssignCompanyLeads,
  canManageCompanyLeads,
  canViewAssignedLeads,
  parseLeadStatus,
  serializeDate,
} from "@/lib/api/company-leads";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

interface CreateLeadBody {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  message?: unknown;
  source?: unknown;
  listingId?: unknown;
  listingTitle?: unknown;
  assignedTo?: unknown;
  nationalId?: unknown;
  quality?: unknown;
  preferredContactMethod?: unknown;
  requirement?: unknown;
}

const LEAD_SOURCE_VALUES = new Set([
  "website_form",
  "whatsapp",
  "phone",
  "walk_in",
  "social_media",
  "referral",
  "marketplace",
  "other",
]);

const LEAD_QUALITY_VALUES = new Set(["qualified", "junk", "unrated"]);
const CONTACT_METHOD_VALUES = new Set(["phone", "whatsapp", "email"]);
const INTENT_VALUES = new Set(["buy", "rent", "invest", "sell"]);
const FINANCING_VALUES = new Set(["cash", "mortgage"]);
const TIMELINE_VALUES = new Set(["immediate", "1_3_months", "browsing"]);
const CATEGORY_VALUES = new Set<string>(Object.values(LISTING_CATEGORIES));

function normalizeQuality(value: unknown): string {
  if (typeof value !== "string") return "unrated";
  return LEAD_QUALITY_VALUES.has(value) ? value : "unrated";
}

function normalizeContactMethod(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return CONTACT_METHOD_VALUES.has(value) ? value : null;
}

function toNonNegativeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Validate + clean the requirement block; returns null when nothing usable. */
function normalizeRequirement(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (typeof r.intent === "string" && INTENT_VALUES.has(r.intent)) {
    out.intent = r.intent;
  }
  if (
    typeof r.propertyType === "string" &&
    CATEGORY_VALUES.has(r.propertyType)
  ) {
    out.propertyType = r.propertyType;
  }
  const region = normalizeText(r.region);
  if (region) out.region = region;
  const city = normalizeText(r.city);
  if (city) out.city = city;
  const district = normalizeText(r.district);
  if (district) out.district = district;

  const budgetMin = toNonNegativeNumber(r.budgetMin);
  if (budgetMin != null) out.budgetMin = budgetMin;
  const budgetMax = toNonNegativeNumber(r.budgetMax);
  if (budgetMax != null) out.budgetMax = budgetMax;
  const bedrooms = toNonNegativeNumber(r.bedrooms);
  if (bedrooms != null) out.bedrooms = bedrooms;

  if (typeof r.financing === "string" && FINANCING_VALUES.has(r.financing)) {
    out.financing = r.financing;
  }
  if (typeof r.timeline === "string" && TIMELINE_VALUES.has(r.timeline)) {
    out.timeline = r.timeline;
  }

  return Object.keys(out).length > 0 ? out : null;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim().toLowerCase();
  if (!next) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) ? next : null;
}

function normalizeSource(value: unknown): string {
  if (typeof value !== "string") return "other";
  const next = value.trim();
  if (!next) return "other";
  return LEAD_SOURCE_VALUES.has(next) ? next : "other";
}

function normalizeUid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? "100");
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(Math.round(parsed), 1), 200);
}

function mapLeadDoc(id: string, data: Record<string, unknown>) {
  const status = parseLeadStatus(data.status) ?? LEAD_STATUSES.NEW;
  return {
    id,
    companyId: typeof data.companyId === "string" ? data.companyId : null,
    name: typeof data.name === "string" ? data.name : "Unknown",
    phone: typeof data.phone === "string" ? data.phone : "",
    email: typeof data.email === "string" ? data.email : "",
    message: typeof data.message === "string" ? data.message : null,
    source: typeof data.source === "string" ? data.source : "other",
    quality: typeof data.quality === "string" ? data.quality : "unrated",
    requirement:
      typeof data.requirement === "object" && data.requirement !== null
        ? (data.requirement as Record<string, unknown>)
        : null,
    listingId: typeof data.listingId === "string" ? data.listingId : null,
    listingTitle:
      typeof data.listingTitle === "string"
        ? data.listingTitle
        : "General inquiry",
    status,
    nationalId: typeof data.nationalId === "string" ? data.nationalId : null,
    assignedTo: typeof data.assignedTo === "string" ? data.assignedTo : null,
    assignedToName:
      typeof data.assignedToName === "string"
        ? data.assignedToName
        : "Unassigned",
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
    firstResponseAt: serializeDate(data.firstResponseAt),
    responseTimeMinutes:
      typeof data.responseTimeMinutes === "number"
        ? data.responseTimeMinutes
        : null,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canViewAssignedLeads(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const canManage = canManageCompanyLeads(user, companyId);
  const canAssign = canAssignCompanyLeads(user, companyId);

  const statusParam = req.nextUrl.searchParams.get("status");
  const limitCount = parseLimit(req.nextUrl.searchParams.get("limit"));
  const assignedToParam = req.nextUrl.searchParams.get("assignedTo");

  const statusFilter: LeadStatus | null = statusParam
    ? parseLeadStatus(statusParam)
    : null;
  if (statusParam && !statusFilter) {
    return NextResponse.json(
      { error: "Invalid lead status." },
      { status: 400 },
    );
  }

  let leadsQuery: FirebaseFirestore.Query = adminDb().collection(
    `companies/${companyId}/leads`,
  );

  if (statusFilter) {
    leadsQuery = leadsQuery.where("status", "==", statusFilter);
  }

  if (!canManage && !canAssign) {
    leadsQuery = leadsQuery.where("assignedTo", "==", user.uid);
  } else if (assignedToParam !== null) {
    const assignedToValue = assignedToParam.trim();
    leadsQuery = leadsQuery.where(
      "assignedTo",
      "==",
      assignedToValue.length > 0 ? assignedToValue : null,
    );
  }

  const snap = await leadsQuery
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();
  const leads = snap.docs.map((doc) =>
    mapLeadDoc(doc.id, doc.data() as Record<string, unknown>),
  );

  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const canManage = canManageCompanyLeads(user, companyId);
  const canAssign = canAssignCompanyLeads(user, companyId);

  if (!canManage && !canAssign) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as CreateLeadBody;

  const name = normalizeText(body.name);
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json(
      { error: "Lead name must be between 2 and 120 characters." },
      { status: 400 },
    );
  }

  const phone = normalizeText(body.phone);
  if (phone.length < 4 || phone.length > 40) {
    return NextResponse.json(
      { error: "Lead phone must be between 4 and 40 characters." },
      { status: 400 },
    );
  }

  const email = normalizeEmail(body.email);
  if (email === null) {
    return NextResponse.json(
      { error: "Lead email is invalid." },
      { status: 400 },
    );
  }

  const message = normalizeText(body.message);
  if (message.length > 4000) {
    return NextResponse.json(
      { error: "Lead message is too long." },
      { status: 400 },
    );
  }

  const nationalId = normalizeText(body.nationalId);
  if (nationalId && !/^\d{10}$/.test(nationalId)) {
    return NextResponse.json(
      { error: "National ID must be exactly 10 digits." },
      { status: 400 },
    );
  }

  const listingId = normalizeUid(body.listingId);
  const listingTitle = normalizeText(body.listingTitle) || "General inquiry";
  const source = normalizeSource(body.source);
  const quality = normalizeQuality(body.quality);
  const preferredContactMethod = normalizeContactMethod(
    body.preferredContactMethod,
  );
  const requirement = normalizeRequirement(body.requirement);

  const assignedTo = normalizeUid(body.assignedTo);
  let assignedToName: string | null = null;

  if (assignedTo) {
    const employeeSnap = await adminDb()
      .doc(`companies/${companyId}/employees/${assignedTo}`)
      .get();

    if (!employeeSnap.exists || employeeSnap.get("active") === false) {
      return NextResponse.json(
        { error: "Target employee is missing or inactive." },
        { status: 400 },
      );
    }

    assignedToName =
      typeof employeeSnap.get("name") === "string"
        ? String(employeeSnap.get("name"))
        : "Assigned employee";
  }

  const actorSnap = await adminDb()
    .doc(`companies/${companyId}/employees/${user.uid}`)
    .get();
  const actorName =
    (actorSnap.exists && typeof actorSnap.get("name") === "string"
      ? String(actorSnap.get("name"))
      : user.email) || "Team member";

  const leadRef = adminDb().collection(`companies/${companyId}/leads`).doc();
  const activityRef = leadRef.collection("activity").doc();

  const batch = adminDb().batch();
  batch.set(leadRef, {
    companyId,
    name,
    phone,
    email: email || null,
    message: message || null,
    nationalId: nationalId || null,
    source,
    quality,
    preferredContactMethod,
    requirement,
    listingId,
    listingTitle,
    assignedTo,
    assignedToName,
    assignedAt: assignedTo ? FieldValue.serverTimestamp() : null,
    status: LEAD_STATUSES.NEW,
    firstResponseAt: null,
    responseTimeMinutes: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(activityRef, {
    companyId,
    leadId: leadRef.id,
    type: "lead_created",
    actorId: user.uid,
    actorName,
    message: assignedTo
      ? `Created lead and assigned to ${assignedToName}`
      : "Created lead",
    metadata: {
      source,
      listingId,
      assignedTo,
      assignedToName,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  if (assignedTo) {
    const notificationRef = adminDb()
      .collection(`companies/${companyId}/notifications`)
      .doc();

    batch.set(notificationRef, {
      companyId,
      recipientId: assignedTo,
      type: "lead_assigned",
      title: "New lead assigned to you",
      message: `${name} was assigned to you.`,
      leadId: leadRef.id,
      read: false,
      actorId: user.uid,
      actorName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return NextResponse.json(
    {
      ok: true,
      lead: {
        id: leadRef.id,
        companyId,
        name,
        phone,
        email: email || null,
        message: message || null,
        nationalId: nationalId || null,
        source,
        listingId,
        listingTitle,
        assignedTo,
        assignedToName,
        status: LEAD_STATUSES.NEW,
        createdAt: null,
        updatedAt: null,
      },
    },
    { status: 201 },
  );
}
