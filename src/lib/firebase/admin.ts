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
  type App,
  getApp,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

const APP_NAME = "admin-app";

function createAdminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Private keys often stored with literal \n — normalize:
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[firebase/admin] Missing FIREBASE_ADMIN_* env vars. " +
        "Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  return initializeApp(
    {
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    APP_NAME,
  );
}

let cachedApp: App | null = null;
function adminApp(): App {
  if (!cachedApp) {
    try {
      cachedApp = createAdminApp();
    } catch {
      cachedApp = getApp(APP_NAME);
    }
  }
  return cachedApp;
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
