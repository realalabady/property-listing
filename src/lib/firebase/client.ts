/**
 * Firebase Client SDK — Singleton
 * -------------------------------
 * Initializes Firebase once per browser/server runtime. Safe to import from
 * client components. Do NOT import `firebase-admin` alongside this file.
 */
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig, assertClientFirebaseEnv } from "./config";

assertClientFirebaseEnv();

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

function getApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getApp());
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getApp());
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) storageInstance = getStorage(getApp());
  return storageInstance;
}

// Convenience named exports — lazily initialized on first access
export const firebaseApp = new Proxy({} as FirebaseApp, {
  get: (_t, prop) => Reflect.get(getApp(), prop as keyof FirebaseApp),
});

export const auth = new Proxy({} as Auth, {
  get: (_t, prop) => Reflect.get(getFirebaseAuth(), prop as keyof Auth),
});

export const db = new Proxy({} as Firestore, {
  get: (_t, prop) => Reflect.get(getFirebaseDb(), prop as keyof Firestore),
});

export const storage = new Proxy({} as FirebaseStorage, {
  get: (_t, prop) =>
    Reflect.get(getFirebaseStorage(), prop as keyof FirebaseStorage),
});
