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
// every authenticated navigation; if the gap exceeds the window the session is
// force-ended even though the absolute __session cookie is still valid.
const ACTIVITY_COOKIE = process.env.SESSION_ACTIVITY_COOKIE_NAME || "sess_activity";
const IDLE_TIMEOUT_MS =
  Number(process.env.SESSION_IDLE_MINUTES || 120) * 60 * 1000;

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

    // Slide the activity window forward on this authenticated request.
    const res = NextResponse.next();
    res.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.ceil(IDLE_TIMEOUT_MS / 1000),
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
