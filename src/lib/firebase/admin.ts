/**
 * Firebase Admin SDK — Server Only
 * --------------------------------
 * Used by Route Handlers, Server Components, and middleware to:
 *   • Verify session cookies
 *   • Set custom claims (role, companyId, permissions)
 *   • Perform privileged reads/writes that bypass security rules
 *
 * NEVER import this file from a Client Component. Doing so will leak the
 * service account credentials into the browser bundle.
 */
import "server-only";
import {
  getApps,
  initializeApp,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

const APP_NAME = "admin-app";

function createAdminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;

  const explicitProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const projectId =
    explicitProjectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  // Private keys often stored with literal \n — normalize:
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  )?.trim();

  const hasServiceAccountEnv =
    Boolean(explicitProjectId) && Boolean(clientEmail) && Boolean(privateKey);

  if (hasServiceAccountEnv) {
    return initializeApp(
      {
        credential: cert({
          projectId: explicitProjectId,
          clientEmail,
          privateKey,
        }),
        projectId: explicitProjectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      },
      APP_NAME,
    );
  }

  if (!projectId) {
    throw new Error(
      "[firebase/admin] Missing FIREBASE_ADMIN_PROJECT_ID and NEXT_PUBLIC_FIREBASE_PROJECT_ID. " +
        "Set one project id value in .env.local and restart the Next.js server.",
    );
  }

  // Local fallback when service-account keys are not available (for orgs that block key creation).
  // Requires gcloud ADC, for example:
  //   - gcloud auth application-default login
  //   - or gcloud auth application-default login --impersonate-service-account=...
  return initializeApp(
    {
      credential: applicationDefault(),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    APP_NAME,
  );
}

let cachedApp: App | null = null;
function adminApp(): App {
  if (cachedApp) return cachedApp;

  try {
    cachedApp = createAdminApp();
    return cachedApp;
  } catch (error) {
    const existing = getApps().find((a) => a.name === APP_NAME);
    if (existing) {
      cachedApp = existing;
      return existing;
    }
    throw error;
  }
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export function adminStorage(): Storage {
  return getStorage(adminApp());
}
