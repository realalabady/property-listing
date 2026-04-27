import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";

// Ensure Node runtime (firebase-admin is not Edge-compatible)
export const runtime = "nodejs";

/**
 * POST /api/auth/session
 * Body: { idToken: string }
 * Exchanges a Firebase ID token for an httpOnly session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken } = (await req.json()) as { idToken?: string };
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the token (throws on invalid/expired)
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    const sessionCookie = await createSessionCookie(idToken);
    await setSessionCookie(sessionCookie);

    return NextResponse.json({
      ok: true,
      uid: decoded.uid,
      role: decoded.role ?? null,
      companyId: decoded.companyId ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

/**
 * DELETE /api/auth/session
 * Clears the session cookie (logout).
 */
export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
