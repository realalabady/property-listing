import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { validateCustomerSignup } from "@/lib/api/customers";
import { ROLES } from "@/constants/roles";
import { rateLimit } from "@/lib/utils/rate-limit";

// firebase-admin is not Edge-compatible.
export const runtime = "nodejs";

/**
 * POST /api/customer/signup — public.
 * Creates a marketplace customer account: a Firebase Auth user with the
 * `customer` role claim + a `customers/{uid}` profile, and returns a custom
 * token the client exchanges for a session. This is intentionally SEPARATE
 * from the (disabled) company signup flow.
 */
export async function POST(req: NextRequest) {
  // Rate-limit signups: 5 per minute per IP.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const rl = rateLimit(`customer:signup:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة. حاول بعد قليل." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof body.company === "string" && body.company.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const result = validateCustomerSignup(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { name, email, phone, password, preferredContactMethod, contactConsent } =
    result.value;

  try {
    const userRecord = await adminAuth().createUser({
      email,
      password,
      displayName: name,
      phoneNumber: undefined,
    });

    await adminAuth().setCustomUserClaims(userRecord.uid, {
      role: ROLES.CUSTOMER,
      companyId: null,
      permissions: [],
    });

    const now = FieldValue.serverTimestamp();
    await adminDb()
      .doc(`customers/${userRecord.uid}`)
      .set({
        uid: userRecord.uid,
        name,
        email,
        phone,
        preferredContactMethod,
        contactConsent,
        createdAt: now,
        updatedAt: now,
      });

    const customToken = await adminAuth().createCustomToken(userRecord.uid, {
      role: ROLES.CUSTOMER,
    });

    return NextResponse.json({ ok: true, customToken }, { status: 201 });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجّل بالفعل." },
        { status: 409 },
      );
    }
    if (code === "auth/operation-not-allowed") {
      return NextResponse.json(
        {
          error:
            "تسجيل الحساب غير مفعّل. يجب تفعيل مزوّد البريد/كلمة المرور في إعدادات Firebase.",
        },
        { status: 503 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    const detail = process.env.NODE_ENV === "production" ? undefined : message;
    return NextResponse.json(
      { error: "تعذّر إنشاء الحساب.", ...(detail ? { detail } : {}) },
      { status: 500 },
    );
  }
}
