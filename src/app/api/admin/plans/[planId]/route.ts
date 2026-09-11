import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { isSubscriptionPlanId } from "@/constants/plans";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ planId: string }>;
}

const MAX_PRICE_SAR = 1_000_000;
const MAX_LABEL_LENGTH = 80;

function parsePrice(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_PRICE_SAR) return null;
  return Math.round(n);
}

function cleanLabel(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH)
    : "";
}

/** `YYYY-MM-DD` → end of that day in Riyadh (UTC+3), as epoch ms. */
function parseEndDate(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "invalid";
  }
  const ms = new Date(`${value}T23:59:59+03:00`).getTime();
  return Number.isFinite(ms) ? ms : "invalid";
}

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

/** PUT — replace one plan's price and offer (super admin only). */
export async function PUT(req: NextRequest, context: RouteContext) {
  const { planId } = await context.params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!isSubscriptionPlanId(planId)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    priceSar?: unknown;
    offer?: {
      enabled?: unknown;
      type?: unknown;
      priceSar?: unknown;
      labelAr?: unknown;
      labelEn?: unknown;
      endsAt?: unknown;
    } | null;
  };

  const priceSar = parsePrice(body.priceSar);
  if (priceSar === null) return bad("سعر الباقة غير صالح.");

  let offer: Record<string, unknown> | null = null;
  if (body.offer) {
    const enabled = body.offer.enabled === true;
    const type = body.offer.type === "text" ? "text" : "discount";
    const labelAr = cleanLabel(body.offer.labelAr);
    const labelEn = cleanLabel(body.offer.labelEn);
    const offerPrice =
      type === "discount" ? parsePrice(body.offer.priceSar) : null;
    const endsAtMs = parseEndDate(body.offer.endsAt);

    if (endsAtMs === "invalid") return bad("تاريخ انتهاء العرض غير صالح.");
    if (enabled) {
      if (!labelAr) return bad("اكتب نص العرض بالعربية.");
      if (type === "discount") {
        if (offerPrice === null) return bad("سعر العرض غير صالح.");
        if (offerPrice >= priceSar) {
          return bad("سعر العرض يجب أن يكون أقل من سعر الباقة.");
        }
      }
      if (endsAtMs !== null && endsAtMs <= Date.now()) {
        return bad("تاريخ انتهاء العرض يجب أن يكون في المستقبل.");
      }
    }

    offer = {
      enabled,
      type,
      priceSar: offerPrice,
      labelAr,
      labelEn,
      endsAt: endsAtMs === null ? null : Timestamp.fromMillis(endsAtMs),
    };
  }

  await adminDb()
    .doc(`plans/${planId}`)
    .set({
      priceSar,
      offer,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    });

  return NextResponse.json({ ok: true });
}
