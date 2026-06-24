#!/usr/bin/env node
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID =
  process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
  "";
const CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() || "";
const PRIVATE_KEY =
  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() || "";

function parseArgs(argv) {
  const args = {
    list: false,
    uid: "",
    resetEmail: "",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--list") {
      args.list = true;
      continue;
    }
    if (token === "--uid") {
      args.uid = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--reset-email") {
      args.resetEmail = argv[i + 1] || "";
      i += 1;
      continue;
    }
  }

  return args;
}

function getCredential() {
  const hasServiceAccount = Boolean(PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY);
  if (hasServiceAccount) {
    return cert({
      projectId: PROJECT_ID,
      clientEmail: CLIENT_EMAIL,
      privateKey: PRIVATE_KEY,
    });
  }

  return applicationDefault();
}

async function main() {
  if (!PROJECT_ID) {
    throw new Error(
      "Missing project id. Set FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.",
    );
  }

  const args = parseArgs(process.argv);
  initializeApp({
    credential: getCredential(),
    projectId: PROJECT_ID,
  });

  const auth = getAuth();

  if (args.list) {
    const result = await auth.listUsers(1000);
    if (result.users.length === 0) {
      console.log("No Firebase Auth users found.");
      return;
    }

    for (const user of result.users) {
      console.log(`${user.uid} | ${user.email || "no-email"}`);
    }
    return;
  }

  if (args.resetEmail) {
    const email = args.resetEmail.trim().toLowerCase();
    if (!email) {
      throw new Error("Missing value for --reset-email.");
    }

    const link = await auth.generatePasswordResetLink(email);
    console.log(`Password reset link for ${email}:`);
    console.log(link);
    return;
  }

  if (!args.uid) {
    throw new Error("Missing --uid argument. Use --list first to find UID.");
  }

  await auth.setCustomUserClaims(args.uid, {
    role: "super_admin",
    companyId: null,
    permissions: [
      "platform_manage_companies",
      "platform_manage_billing",
      "platform_view_analytics",
    ],
  });

  const updated = await auth.getUser(args.uid);
  console.log(
    "Updated claims:",
    JSON.stringify(updated.customClaims || {}, null, 2),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
