import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * Clears the "please reset your password" reminder for the signed-in employee.
 * Called by the settings change-password form only AFTER the password was
 * actually updated in Firebase Auth (client-side), so the banner disappears
 * exclusively once the user has reset their password.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (!user.companyId) {
    return NextResponse.json({ error: "No company." }, { status: 400 });
  }

  await adminDb()
    .doc(`companies/${user.companyId}/employees/${user.uid}`)
    .set(
      {
        passwordResetRequired: false,
        passwordChangedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return NextResponse.json({ ok: true });
}
