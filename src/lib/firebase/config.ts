/**
 * Firebase Client Configuration
 * -----------------------------
 * Reads from NEXT_PUBLIC_ env vars. These are safe to expose (per Firebase
 * design) — actual security is enforced by Firestore Rules + Auth claims.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function assertClientFirebaseEnv(): void {
  const requiredValues: Record<string, string | undefined> = {
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
    NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
  };
  const missing = Object.entries(requiredValues)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    // Log but don't throw during build — app shell may still render.
    // Individual SDK calls will fail fast with clear errors.
    // eslint-disable-next-line no-console
    console.warn(
      `[firebase/config] Missing env vars: ${missing.join(", ")}. ` +
        `Copy .env.local.example → .env.local and fill in your Firebase project.`,
    );
  }
}
