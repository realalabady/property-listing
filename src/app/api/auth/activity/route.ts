import { NextResponse, type NextRequest } from "next/server";

// Ensure Node runtime for parity with the rest of the auth routes.
export const runtime = "nodejs";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "__session";
const ACTIVITY_COOKIE =
  process.env.SESSION_ACTIVITY_COOKIE_NAME || "sess_activity";
const SESSION_EXPIRES_DAYS = Number(process.env.SESSION_EXPIRES_IN_DAYS || 5);
const SESSION_EXPIRES_SECONDS = SESSION_EXPIRES_DAYS * 24 * 60 * 60;

/**
 * POST /api/auth/activity
 * Idle-timeout heartbeat. The client watchdog (`IdleTimeout`) calls this,
 * throttled, on REAL user interaction (mouse/keyboard/scroll/touch). It slides
 * the server-side `sess_activity` timestamp forward so the middleware's idle
 * check stays in sync with actual activity.
 *
 * Why this exists: the middleware only refreshes `sess_activity` on full
 * navigations to protected routes. Long single-view work (filling the listing
 * form, the pipeline board, filtering matched-leads) happens over `/api` calls
 * and direct client-Firestore writes, which both bypass the middleware — so
 * without a heartbeat the timestamp goes stale mid-work and the next navigation
 * would wrongly log an active user out.
 *
 * Auth: no verification needed. The timestamp is meaningless on its own — real
 * auth still comes from the httpOnly `__session` cookie, which every guard
 * verifies. We only refresh when that cookie is present so a request without a
 * session can't keep a phantom activity window alive.
 */
export async function POST(req: NextRequest) {
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;
  if (!hasSession) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTIVITY_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRES_SECONDS,
  });
  return res;
}
