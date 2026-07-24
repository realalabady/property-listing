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
import { assertActiveMember } from "@/lib/api/guards";
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

function str(value: unknown, maxLen = 500): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 && next.length <= maxLen ? next : null;
}

/** Deed/title keys that are confidential on NEW listings (moved to the
 * private subdoc; legacy listings keep them in `details`). */
const CONFIDENTIAL_DEED_KEYS = [
  "deedType",
  "deedNumber",
  "deedIssueDate",
  "deedReference",
  "propertyNumber",
] as const;

interface ContactShape {
  name: string;
  role?: string;
  phone?: string;
  note?: string;
}

function sanitizeBrokerInfo(value: unknown): Record<string, string> {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const out: Record<string, string> = {};
  const agencyName = str(record.agencyName, 160);
  const brokerName = str(record.brokerName, 160);
  const phone = str(record.phone, 30);
  if (agencyName) out.agencyName = agencyName;
  if (brokerName) out.brokerName = brokerName;
  if (phone) out.phone = phone;
  return out;
}

const PUBLISH_PLATFORM_KEYS = [
  "aqar",
  "instagram",
  "x",
  "facebook",
  "snapchat",
] as const;

function sanitizePublishedOn(value: unknown): Record<string, boolean> {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const out: Record<string, boolean> = {};
  for (const key of PUBLISH_PLATFORM_KEYS) {
    out[key] = record[key] === true;
  }
  return out;
}

function sanitizeContacts(value: unknown): ContactShape[] {
  if (!Array.isArray(value)) return [];
  const out: ContactShape[] = [];
  for (const entry of value.slice(0, 20)) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const name = str(record.name, 120);
    if (!name) continue;
    const contact: ContactShape = { name };
    const role = str(record.role, 120);
    const phone = str(record.phone, 30);
    const note = str(record.note, 300);
    if (role) contact.role = role;
    if (phone) contact.phone = phone;
    if (note) contact.note = note;
    out.push(contact);
  }
  return out;
}

/**
 * Build the protected `private/data` payload for a NEW listing from the
 * request body, moving confidential deed keys out of `details` and — when the
 * company restricts contact-phone visibility — phones out of `contacts`.
 * Mutates `details`/returns the (possibly phone-stripped) contacts.
 */
function extractPrivateData(
  body: Record<string, unknown>,
  details: Record<string, unknown>,
  contacts: ContactShape[],
  restrictPhones: boolean,
): {
  privateData: Record<string, unknown> | null;
  publicContacts: ContactShape[];
} {
  const rawPrivate =
    typeof body.privateData === "object" && body.privateData !== null
      ? (body.privateData as Record<string, unknown>)
      : {};

  // Owner block (only from the explicit privateData payload).
  const rawOwner =
    typeof rawPrivate.owner === "object" && rawPrivate.owner !== null
      ? (rawPrivate.owner as Record<string, unknown>)
      : {};
  const owner: Record<string, string> = {};
  const ownerName = str(rawOwner.name, 160);
  const ownerPhone = str(rawOwner.phone, 30);
  const ownerNationalId = str(rawOwner.nationalId, 30);
  const ownerNote = str(rawOwner.note, 500);
  if (ownerName) owner.name = ownerName;
  if (ownerPhone) owner.phone = ownerPhone;
  if (ownerNationalId) owner.nationalId = ownerNationalId;
  if (ownerNote) owner.note = ownerNote;

  // Deed block: accept from privateData.deed, and ALWAYS strip confidential
  // deed keys out of `details` (defense in depth — new listings never store
  // deed data on the member-readable main doc, whatever the client sends).
  const rawDeed =
    typeof rawPrivate.deed === "object" && rawPrivate.deed !== null
      ? (rawPrivate.deed as Record<string, unknown>)
      : {};
  const deed: Record<string, string> = {};
  for (const key of CONFIDENTIAL_DEED_KEYS) {
    const fromPrivate = str(rawDeed[key], 160);
    const fromDetails = str(details[key], 160);
    const value = fromPrivate ?? fromDetails;
    if (value) deed[key] = value;
    delete details[key];
  }

  // Contact phones: when restricted, full contacts go private and the main
  // doc keeps a phone-less projection.
  let publicContacts = contacts;
  let restrictedContacts: ContactShape[] = [];
  if (restrictPhones && contacts.some((c) => c.phone)) {
    restrictedContacts = contacts;
    publicContacts = contacts.map(({ name, role, note }) => ({
      name,
      ...(role ? { role } : {}),
      ...(note ? { note } : {}),
    }));
  }

  const privateData: Record<string, unknown> = {};
  if (Object.keys(owner).length > 0) privateData.owner = owner;
  if (Object.keys(deed).length > 0) privateData.deed = deed;
  if (restrictedContacts.length > 0)
    privateData.restrictedContacts = restrictedContacts;

  return {
    privateData: Object.keys(privateData).length > 0 ? privateData : null,
    publicContacts,
  };
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

  // Re-check live membership (employee.active) and company status; claims in
  // the session cookie can be stale. Quota is enforced transactionally below.
  const membership = await assertActiveMember(user, companyId);
  if (!membership.ok) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status },
    );
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
  const contacts = sanitizeContacts(body.contacts);

  // Company visibility policy for contact phone numbers (note: settings doc
  // may not exist yet — default is "everyone").
  const settingsSnap = await adminDb()
    .doc(`companies/${companyId}/settings/default`)
    .get();
  const visibility =
    settingsSnap.exists &&
    typeof settingsSnap.get("visibility") === "object" &&
    settingsSnap.get("visibility") !== null
      ? (settingsSnap.get("visibility") as Record<string, unknown>)
      : {};
  const restrictPhones = visibility.contactPhones === "restricted";

  const { privateData, publicContacts } = extractPrivateData(
    body,
    details,
    contacts,
    restrictPhones,
  );

  // Optional auction, only for for-sale listings. The form sends
  // `auction.enabled` + a starting bid; bids themselves are placed later from
  // the detail page. Starts open with no bids yet.
  const listingType = typeof body.type === "string" ? body.type : "sale";
  const auctionInput =
    typeof body.auction === "object" && body.auction !== null
      ? (body.auction as Record<string, unknown>)
      : null;
  const auctionEnabled =
    listingType === "sale" && auctionInput?.enabled === true;
  const auctionDoc = auctionEnabled
    ? {
        auction: {
          enabled: true,
          status: "open" as const,
          startPrice: num(auctionInput?.startPrice) ?? price,
          minIncrement: Math.max(
            0,
            Math.round(Number(auctionInput?.minIncrement) || 0),
          ),
          currentBid: null,
          bidCount: 0,
          highBidId: null,
          highBidByEmployeeId: null,
          highBidByEmployeeName: null,
          startedByEmployeeId: user.uid,
          startedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          closedAt: null,
        },
      }
    : {};

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
      // Only a pasted map pin is precise; the flag lets the map skip jitter.
      preciseLocation: location.preciseLocation === true,
      ...(str(location.mapUrl, 2048)
        ? { mapUrl: str(location.mapUrl, 2048) }
        : {}),
    },
    area,
    areaUnit: typeof body.areaUnit === "string" ? body.areaUnit : "sqm",
    amenities,
    contacts: publicContacts,
    details,
    hasPrivateData: privateData !== null,
    source: body.source === "broker" ? "broker" : "owner",
    ...(body.source === "broker" &&
    typeof body.brokerInfo === "object" &&
    body.brokerInfo !== null
      ? { brokerInfo: sanitizeBrokerInfo(body.brokerInfo) }
      : {}),
    publishedOn: sanitizePublishedOn(body.publishedOn),
    ...auctionDoc,
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

  // Quota check + create + counter bump in ONE transaction so two concurrent
  // requests can't both slip under the cap (aggregate count() can't run in a
  // transaction — that's why we keep an incremented `listingsCount`, which the
  // syncGlobalListing trigger re-derives from an exact count on every listing
  // write to self-heal any drift).
  const listingRef = adminDb()
    .collection(`companies/${companyId}/listings`)
    .doc();
  try {
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(companyRef);
      const company = (snap.data() ?? {}) as Record<string, unknown>;

      const plan = parseSubscriptionPlan(company.subscriptionPlan);
      const { maxListings } = limitsForPlan(plan);
      const current =
        typeof company.listingsCount === "number" ? company.listingsCount : 0;
      if (!isUnlimited(maxListings) && current >= maxListings) {
        throw new ListingQuotaError(maxListings);
      }

      tx.create(listingRef, doc);
      if (privateData) {
        tx.create(listingRef.collection("private").doc("data"), {
          ...privateData,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: user.uid,
        });
      }
      tx.update(companyRef, {
        listingsCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    if (err instanceof ListingQuotaError) {
      return NextResponse.json(
        {
          error: "خطتك وصلت الحد الأقصى للباقة — قم بالترقية.",
          code: "PLAN_LIMIT",
          maxListings: err.maxListings,
        },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true, id: listingRef.id }, { status: 201 });
}

class ListingQuotaError extends Error {
  constructor(readonly maxListings: number) {
    super("PLAN_LIMIT");
  }
}
