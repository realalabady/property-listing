import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionCookie,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
} from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getClientIp, rateLimit } from "@/lib/utils/rate-limit";

// Ensure Node runtime (firebase-admin is not Edge-compatible)
export const runtime = "nodejs";

async function trackSuccessfulSignIn(decoded: {
  uid: string;
  role?: unknown;
  companyId?: unknown;
}) {
  const batch = adminDb().batch();
  const now = FieldValue.serverTimestamp();

  batch.set(
    adminDb().doc(`users/${decoded.uid}`),
    {
      uid: decoded.uid,
      role: typeof decoded.role === "string" ? decoded.role : null,
      companyId:
        typeof decoded.companyId === "string" ? decoded.companyId : null,
      lastSignInAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  if (typeof decoded.companyId === "string" && decoded.companyId.length > 0) {
    batch.set(
      adminDb().doc(`companies/${decoded.companyId}`),
      {
        lastSignInAt: now,
        lastSignInBy: decoded.uid,
        updatedAt: now,
      },
      { merge: true },
    );

    batch.set(
      adminDb().doc(`companies/${decoded.companyId}/employees/${decoded.uid}`),
      {
        lastSignInAt: now,
        lastActiveAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  await batch.commit();
}

/**
 * POST /api/auth/session
 * Body: { idToken: string }
 * Exchanges a Firebase ID token for an httpOnly session cookie.
 */
export async function POST(req: NextRequest) {
  // Rate-limit login attempts: 10 per minute per IP
  const ip = getClientIp(req);
  const rl = await rateLimit(`auth:session:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  try {
    const { idToken } = (await req.json()) as { idToken?: string };
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the token (throws on invalid/expired)
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    const sessionCookie = await createSessionCookie(idToken);
    await setSessionCookie(sessionCookie);

    try {
      await trackSuccessfulSignIn(decoded);
    } catch {
      // Do not block login if activity tracking fails.
    }

    return NextResponse.json({
      ok: true,
      uid: decoded.uid,
      role: decoded.role ?? null,
      companyId: decoded.companyId ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const detail = process.env.NODE_ENV === "production" ? undefined : message;

    const lower = message.toLowerCase();
    const isServerConfigError =
      lower.includes("[firebase/admin]") ||
      lower.includes("missing required env vars") ||
      lower.includes("no firebase app 'admin-app'");

    if (isServerConfigError) {
      return NextResponse.json(
        {
          code: "SERVER_AUTH_CONFIG_MISSING",
          error:
            "Server auth is not configured. Set FIREBASE_ADMIN_* in .env.local and restart dev server.",
          ...(detail ? { detail } : {}),
        },
        { status: 500 },
      );
    }

    const isInvalidTokenError =
      lower.includes("id token") ||
      lower.includes("verifyidtoken") ||
      lower.includes("argument-error");

    if (isInvalidTokenError) {
      return NextResponse.json(
        {
          code: "INVALID_ID_TOKEN",
          error: "Invalid or expired authentication token.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        code: "SESSION_CREATE_FAILED",
        error: "Failed to create server session.",
        ...(detail ? { detail } : {}),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/auth/session
 * Lightweight session probe: 200 when the httpOnly session cookie still
 * resolves to a user, 401 when it's gone/expired. The client uses this to
 * confirm a real logout before ending the visit (a transient client-side
 * Firebase blip must NOT sign the user out).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

/**
 * DELETE /api/auth/session
 * Clears the session cookie (logout).
 */
export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
