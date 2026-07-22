import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js Middleware — Edge runtime
 * ---------------------------------
 * We do a LIGHTWEIGHT check here: presence of the session cookie only.
 * Deep verification (signature + revocation) happens in server layouts
 * via `requireAuth()` which calls the Firebase Admin SDK (Node runtime only).
 *
 * This gives us:
 *   - Fast edge redirects for obvious unauthenticated requests
 *   - Secure deep verification on the Node server before rendering protected UI
 */

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "__session";
// Sliding idle-timeout cookie: holds the last-activity epoch (ms). Refreshed on
// every authenticated navigation here AND by the client's `/api/auth/activity`
// heartbeat during in-view work; if the gap exceeds the window the session is
// force-ended even though the absolute __session cookie is still valid.
const ACTIVITY_COOKIE = process.env.SESSION_ACTIVITY_COOKIE_NAME || "sess_activity";
const IDLE_TIMEOUT_MS =
  Number(process.env.SESSION_IDLE_MINUTES || 20) * 60 * 1000;
// The activity cookie must OUTLIVE the idle window — if its own maxAge equalled
// the window it would self-delete exactly when the idle check should fire,
// erasing the timestamp and defeating the check. Tie it to the absolute session
// lifetime instead; the idle math (below) is the only thing that expires it.
const SESSION_ACTIVITY_MAX_AGE =
  Number(process.env.SESSION_EXPIRES_IN_DAYS || 5) * 24 * 60 * 60;

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/onboarding"];
const AUTH_PAGES = ["/login", "/signup"];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  // Protect private routes
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!hasSession) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const now = Date.now();
    const lastSeenRaw = req.cookies.get(ACTIVITY_COOKIE)?.value;
    const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : null;

    // Idle too long → clear cookies and bounce to login.
    if (lastSeen && Number.isFinite(lastSeen) && now - lastSeen > IDLE_TIMEOUT_MS) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("reauth", "1");
      loginUrl.searchParams.set("idle", "1");
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(SESSION_COOKIE);
      res.cookies.delete(ACTIVITY_COOKIE);
      return res;
    }

    // Slide the activity window forward on this authenticated navigation. The
    // client also heartbeats `/api/auth/activity` during in-view work (API /
    // Firestore calls never reach this middleware), so the timestamp stays fresh
    // while the user is genuinely active — not only when they change routes.
    const res = NextResponse.next();
    res.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_ACTIVITY_MAX_AGE,
    });
    return res;
  }

  // If already authenticated, redirect away from auth pages
  if (AUTH_PAGES.some((p) => pathname === p) && hasSession) {
    // Allow auth pages during forced re-authentication to avoid redirect loops
    // when a stale cookie exists but server verification fails.
    if (searchParams.get("reauth") === "1") {
      return NextResponse.next();
    }

    const dashUrl = req.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *   - _next/static, _next/image, favicon.ico
     *   - /api routes (handled by route handlers themselves)
     *   - public assets (any file with an extension)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)",
  ],
};
