import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { limitsForPlan, isUnlimited } from "@/constants/plans";
import {
  LISTING_STATUSES,
  type ListingStatus,
} from "@/constants/listing-categories";
import { hasAnyPermission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import type { SubscriptionPlanId } from "@/types/company";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

const VALID_STATUSES = new Set<string>(Object.values(LISTING_STATUSES));

function parseSubscriptionPlan(value: unknown): SubscriptionPlanId {
  if (
    value === "free" ||
    value === "starter" ||
    value === "pro" ||
    value === "enterprise"
  ) {
    return value;
  }
  return "starter";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Return the company's current listing usage against its plan cap so forms can
 * pre-check and disable the submit at the limit (the POST still enforces it).
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (user.role !== ROLES.SUPER_ADMIN && user.companyId !== companyId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const companySnap = await adminDb().doc(`companies/${companyId}`).get();
  if (!companySnap.exists) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const plan = parseSubscriptionPlan(
    (companySnap.data() as Record<string, unknown>).subscriptionPlan,
  );
  const { maxListings } = limitsForPlan(plan);
  const countSnap = await adminDb()
    .collection(`companies/${companyId}/listings`)
    .count()
    .get();
  const count = countSnap.data().count;

  return NextResponse.json({
    plan,
    count,
    maxListings,
    atLimit: !isUnlimited(maxListings) && count >= maxListings,
  });
}

/**
 * Create a listing under a company. This is the ONLY write path for new
 * listings (firestore rules deny client `create`), so the per-plan listing
 * quota is enforced here and cannot be bypassed from the client.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;
  const isCompanyMember = user.companyId === companyId;
  const canCreate =
    isSuperAdmin ||
    (isCompanyMember && hasAnyPermission(user.permissions, ["create_listing"]));

  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const companyRef = adminDb().doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const company = companySnap.data() as Record<string, unknown>;
  const status = typeof company.status === "string" ? company.status : "trial";
  if (status === "suspended" || status === "cancelled" || company.isDeleted) {
    return NextResponse.json(
      { error: "Company is not active." },
      { status: 403 },
    );
  }

  // Enforce the per-plan listing quota via a server-side count.
  const plan = parseSubscriptionPlan(company.subscriptionPlan);
  const { maxListings } = limitsForPlan(plan);
  if (!isUnlimited(maxListings)) {
    const countSnap = await adminDb()
      .collection(`companies/${companyId}/listings`)
      .count()
      .get();
    if (countSnap.data().count >= maxListings) {
      return NextResponse.json(
        {
          error: "خطتك وصلت الحد الأقصى للباقة — قم بالترقية.",
          code: "PLAN_LIMIT",
          maxListings,
        },
        { status: 409 },
      );
    }
  }

  const body = (await req.json()) as Record<string, unknown>;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const price = num(body.price);
  const area = num(body.area);
  if (!title) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 },
    );
  }
  if (price === null || price <= 0) {
    return NextResponse.json({ error: "Invalid price." }, { status: 400 });
  }
  if (area === null || area <= 0) {
    return NextResponse.json({ error: "Invalid area." }, { status: 400 });
  }

  const listingStatus: ListingStatus = VALID_STATUSES.has(
    body.status as string,
  )
    ? (body.status as ListingStatus)
    : LISTING_STATUSES.DRAFT;

  const location =
    typeof body.location === "object" && body.location !== null
      ? (body.location as Record<string, unknown>)
      : {};
  const amenities =
    typeof body.amenities === "object" && body.amenities !== null
      ? (body.amenities as Record<string, unknown>)
      : {};
  const details =
    typeof body.details === "object" && body.details !== null
      ? (body.details as Record<string, unknown>)
      : {};
  const contacts = Array.isArray(body.contacts) ? body.contacts : [];

  const doc: Record<string, unknown> = {
    companyId,
    title,
    description:
      typeof body.description === "string" ? body.description.trim() : "",
    type: typeof body.type === "string" ? body.type : "sale",
    category: typeof body.category === "string" ? body.category : "apartment",
    price,
    currency: typeof body.currency === "string" ? body.currency : "SAR",
    rentPeriod: typeof body.rentPeriod === "string" ? body.rentPeriod : null,
    priceNegotiable: body.priceNegotiable === true,
    location: {
      country: typeof location.country === "string" ? location.country : "",
      region: typeof location.region === "string" ? location.region : "",
      city: typeof location.city === "string" ? location.city : "",
      district:
        typeof location.district === "string" ? location.district : "",
      lat: num(location.lat),
      lng: num(location.lng),
    },
    area,
    areaUnit: typeof body.areaUnit === "string" ? body.areaUnit : "sqm",
    amenities,
    contacts,
    details,
    status: listingStatus,
    media: [],
    coverImage: null,
    assignedEmployeeId: null,
    featured: false,
    publishedAt:
      listingStatus === LISTING_STATUSES.PUBLISHED
        ? FieldValue.serverTimestamp()
        : null,
    analytics: {
      views: 0,
      uniqueViews: 0,
      inquiries: 0,
      whatsappClicks: 0,
      phoneClicks: 0,
      favorites: 0,
    },
    createdBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Carry through optional top-level numeric specs when present.
  for (const key of ["bedrooms", "bathrooms", "yearBuilt"] as const) {
    const value = num(body[key]);
    if (value !== null) doc[key] = value;
  }

  const listingRef = await adminDb()
    .collection(`companies/${companyId}/listings`)
    .add(doc);

  return NextResponse.json({ ok: true, id: listingRef.id }, { status: 201 });
}
