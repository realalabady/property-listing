import "server-only";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * Turns Firebase's password-reset link into one on our own domain.
 *
 * `generatePasswordResetLink` always returns a URL on the project's authDomain
 * (`<project>.firebaseapp.com/__/auth/action?...`) — an unbranded Google page
 * showing a raw project id, which reads as a phishing attempt to anyone who
 * clicks it. The only part we actually need is the `oobCode`; the client SDK's
 * `verifyPasswordResetCode` / `confirmPasswordReset` accept it directly.
 *
 * So we pull the code out and rebuild the link against our own /reset-password
 * page. This needs no Firebase Console configuration.
 */

/** Path of the in-app reset handler. Keep in sync with the route folder. */
export const RESET_PASSWORD_PATH = "/reset-password";

/**
 * @param email    Account to generate the reset code for.
 * @param baseUrl  Public origin, from `resolveAppBaseUrl(req)`.
 * @returns The branded URL, or `null` if the account has no Firebase Auth user
 *          or the link could not be generated. Callers treat null as "skip the
 *          email" rather than as an error.
 */
export async function buildPasswordResetUrl(
  email: string,
  baseUrl: string,
): Promise<string | null> {
  let firebaseLink: string;
  try {
    firebaseLink = await adminAuth().generatePasswordResetLink(email);
  } catch {
    return null;
  }

  const oobCode = extractOobCode(firebaseLink);
  if (!oobCode) {
    // Firebase changed the link shape — better to send nothing than to send a
    // firebaseapp.com URL, which is the exact problem this module exists for.
    return null;
  }

  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}${RESET_PASSWORD_PATH}?oobCode=${encodeURIComponent(oobCode)}`;
}

function extractOobCode(link: string): string | null {
  try {
    return new URL(link).searchParams.get("oobCode");
  } catch {
    return null;
  }
}
