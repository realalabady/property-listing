#!/usr/bin/env node
import { randomBytes } from "crypto";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID =
  process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
  "";
const CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() || "";
const PRIVATE_KEY =
  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() || "";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://property-listing-7f3db.web.app";

function parseArgs(argv) {
  const args = {
    to: "",
    companyId: "",
    baseUrl: DEFAULT_BASE_URL,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--to") {
      args.to = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--company-id") {
      args.companyId = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--base-url") {
      args.baseUrl = argv[i + 1] || DEFAULT_BASE_URL;
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

function normalizeBaseUrl(url) {
  return url.replace(/\/$/, "");
}

function parseErrorText(payload) {
  if (!payload || typeof payload !== "object") return "Unknown error";
  if ("error" in payload) {
    const error = payload.error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
      return String(error.message);
    }
  }
  return JSON.stringify(payload);
}

function extractCookieValue(response, cookieName) {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : (() => {
          const single = response.headers.get("set-cookie");
          return single ? [single] : [];
        })();

  for (const setCookie of setCookies) {
    const first = setCookie.split(";", 1)[0] || "";
    const prefix = `${cookieName}=`;
    if (first.startsWith(prefix)) {
      return first;
    }
  }

  return "";
}

async function findCompanyId(db, explicitCompanyId) {
  if (explicitCompanyId) {
    const snap = await db.doc(`companies/${explicitCompanyId}`).get();
    if (!snap.exists) {
      throw new Error(`Company not found: ${explicitCompanyId}`);
    }
    return explicitCompanyId;
  }

  const firstCompany = await db.collection("companies").limit(1).get();
  if (firstCompany.empty) {
    throw new Error("No company documents found. Create a company first.");
  }

  return firstCompany.docs[0].id;
}

async function signInWithPassword(email, password, apiKey) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`signInWithPassword failed: ${parseErrorText(payload)}`);
  }

  if (!payload.idToken) {
    throw new Error("signInWithPassword returned no idToken.");
  }

  return payload.idToken;
}

async function createSessionCookie(baseUrl, idToken, cookieName) {
  const response = await fetch(`${baseUrl}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Session exchange failed: ${parseErrorText(payload)}`);
  }

  const cookie = extractCookieValue(response, cookieName);
  if (!cookie) {
    throw new Error(
      `Session cookie ${cookieName} missing in response headers.`,
    );
  }

  return cookie;
}

async function sendEmployeeInvite(baseUrl, companyId, inviteTo, sessionCookie) {
  const response = await fetch(
    `${baseUrl}/api/companies/${companyId}/invitations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        email: inviteTo,
        name: "SMTP Verification",
        role: "viewer",
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Employee invite failed: ${parseErrorText(payload)}`);
  }

  return payload;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!PROJECT_ID) {
    throw new Error(
      "Missing project id. Set FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.",
    );
  }
  if (!args.to) {
    throw new Error("Missing --to <email> argument.");
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || "";
  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY in environment.");
  }

  const sessionCookieName =
    process.env.SESSION_COOKIE_NAME?.trim() || "__session";
  const baseUrl = normalizeBaseUrl(args.baseUrl);

  initializeApp({
    credential: getCredential(),
    projectId: PROJECT_ID,
  });

  const auth = getAuth();
  const db = getFirestore();

  const companyId = await findCompanyId(db, args.companyId);

  const tempEmail = `smtp-check-${Date.now()}@example.test`;
  const tempPassword = `${randomBytes(12).toString("hex")}Aa!`;

  let tempUid = "";
  try {
    const user = await auth.createUser({
      email: tempEmail,
      password: tempPassword,
      displayName: "SMTP Verifier",
    });
    tempUid = user.uid;

    await auth.setCustomUserClaims(tempUid, {
      role: "super_admin",
      companyId: null,
      permissions: [
        "platform_manage_companies",
        "platform_manage_billing",
        "platform_view_analytics",
      ],
    });

    const idToken = await signInWithPassword(tempEmail, tempPassword, apiKey);
    const sessionCookie = await createSessionCookie(
      baseUrl,
      idToken,
      sessionCookieName,
    );

    const result = await sendEmployeeInvite(
      baseUrl,
      companyId,
      args.to,
      sessionCookie,
    );

    console.log("Invite verification completed.");
    console.log(`baseUrl: ${baseUrl}`);
    console.log(`companyId: ${companyId}`);
    console.log(`invitationEmailSent: ${Boolean(result.invitationEmailSent)}`);
    console.log(
      `invitationEmailSkipped: ${Boolean(result.invitationEmailSkipped)}`,
    );
    console.log(`invitationEmailReason: ${result.invitationEmailReason ?? ""}`);
    console.log(`suggestedLoginUrl: ${result.suggestedLoginUrl ?? ""}`);
    console.log(`acceptApiUrl: ${result.acceptApiUrl ?? ""}`);
  } finally {
    if (tempUid) {
      await auth.deleteUser(tempUid).catch(() => {});
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
