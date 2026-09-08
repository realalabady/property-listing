import { NextResponse, type NextRequest } from "next/server";
import { buildPasswordResetUrl } from "@/lib/auth/password-reset-link";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { adminAuth } from "@/lib/firebase/admin";
import { resolveAppBaseUrl } from "@/lib/url/app-base-url";
import { getClientIp, rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/auth/password-reset — public "I forgot my password".
 *
 * Replaces the client SDK's `sendPasswordResetEmail`, which sent Firebase's own
 * unbranded template from a firebaseapp.com address and linked to Firebase's
 * hosted handler page. This routes the whole thing through our SMTP transport,
 * our Arabic template, and our own /reset-password page.
 *
 * Always responds 200 `{ ok: true }` regardless of whether the account exists,
 * so the endpoint can't be used to enumerate registered emails.
 */

const WINDOW_MS = 15 * 60 * 1000;
const PER_IP_LIMIT = 8;
const PER_EMAIL_LIMIT = 4;

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Shape check only — an invalid address still returns ok:true below so the
  // response can't distinguish "malformed" from "not registered".
  const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const ip = getClientIp(req);
  const ipLimit = await rateLimit(`pwreset:ip:${ip}`, PER_IP_LIMIT, WINDOW_MS);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  if (looksValid) {
    // Also limit per address so one IP can't spray reset mail at many inboxes,
    // and so a single mailbox can't be flooded from rotating IPs.
    const emailLimit = await rateLimit(
      `pwreset:email:${email}`,
      PER_EMAIL_LIMIT,
      WINDOW_MS,
    );

    if (emailLimit.allowed) {
      await trySendReset(req, email);
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Best-effort send. Every failure path is swallowed: the caller must not be
 * able to tell an unknown address from a delivery problem.
 */
async function trySendReset(req: NextRequest, email: string): Promise<void> {
  try {
    const userRecord = await adminAuth().getUserByEmail(email);

    const resetUrl = await buildPasswordResetUrl(
      email,
      resolveAppBaseUrl(req),
    );
    if (!resetUrl) return;

    await sendPasswordResetEmail({
      to: email,
      name: userRecord.displayName ?? null,
      resetUrl,
    });
  } catch (error) {
    // auth/user-not-found is the expected case for an unregistered address.
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code !== "auth/user-not-found") {
      console.error("[password-reset] failed:", error);
    }
  }
}
