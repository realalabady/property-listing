import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "__session";

/**
 * TEMPORARY DIAGNOSTIC — GET /api/auth/debug
 * Reveals why the client Firebase session drops on reload. The critical field
 * is `account.tokensValidAfterTime`: if it is NEWER than the session cookie's
 * `auth_time`, the user's refresh tokens were revoked AFTER they signed in, so
 * the client SDK can no longer refresh (the accounts:lookup 400) even though the
 * server session cookie (verified with checkRevoked=false) still works.
 * Remove this route once the issue is resolved.
 */
export async function GET() {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  const out: Record<string, unknown> = { hasCookie: !!cookie };

  if (cookie) {
    try {
      const decoded = await adminAuth().verifySessionCookie(cookie, false);
      const authTimeMs = (decoded.auth_time ?? 0) * 1000;
      out.session = {
        uid: decoded.uid,
        auth_time: new Date(authTimeMs).toISOString(),
        iat: new Date((decoded.iat ?? 0) * 1000).toISOString(),
        exp: new Date((decoded.exp ?? 0) * 1000).toISOString(),
      };
      const rec = await adminAuth().getUser(decoded.uid);
      const validAfter = rec.tokensValidAfterTime
        ? Date.parse(rec.tokensValidAfterTime)
        : 0;
      out.account = {
        disabled: rec.disabled,
        tokensValidAfterTime: rec.tokensValidAfterTime ?? null,
        lastRefreshTime: rec.metadata.lastRefreshTime ?? null,
        lastSignInTime: rec.metadata.lastSignInTime ?? null,
      };
      // The smoking gun: was the session minted BEFORE the last revoke?
      out.clientTokenRevoked = validAfter > authTimeMs;
    } catch (e) {
      out.verifyError = e instanceof Error ? e.message : String(e);
    }
  }

  console.log("[auth-debug] /api/auth/debug ->", JSON.stringify(out, null, 2));
  return NextResponse.json(out);
}
