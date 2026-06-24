#!/usr/bin/env node
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
  process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
  "";
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || "";

if (!projectId) {
  throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID/FIREBASE_ADMIN_PROJECT_ID");
}
if (!apiKey) {
  throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
}

initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();

const baseUrl = process.argv[2] || "https://property-listing-7f3db.web.app";
const email = `copilot-session-test-${Date.now()}@example.com`;
const password = "TempPass!123";

async function main() {
  const user = await auth.createUser({
    email,
    password,
    emailVerified: true,
    displayName: "Session Test",
  });

  try {
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const signInPayload = await signInRes.json();

    console.log("signIn status:", signInRes.status);
    if (!signInRes.ok) {
      console.log("signIn payload:", JSON.stringify(signInPayload, null, 2));
      process.exitCode = 1;
      return;
    }

    const idToken = signInPayload.idToken;
    const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    const sessionBody = await sessionRes.text();
    console.log("session status:", sessionRes.status);
    console.log("session body:", sessionBody);
  } finally {
    await auth.deleteUser(user.uid);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
