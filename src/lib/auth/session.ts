import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import type { Role } from "@/constants/roles";
import type { Permission } from "@/constants/permissions";
import type { AppClaims } from "./claims";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "__session";
const SESSION_EXPIRES_DAYS = Number(process.env.SESSION_EXPIRES_IN_DAYS || 5);
const SESSION_EXPIRES_MS = SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

export interface SessionUser {
  uid: string;
  email: string | undefined;
  role: Role | null;
  companyId: string | null;
  permissions: Permission[];
}

/**
 * Create a Firebase session cookie from an ID token (called on login).
 * Cookie is httpOnly, secure, sameSite=lax — safe from XSS token theft.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  const sessionCookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRES_MS,
  });
  return sessionCookie;
}

export async function setSessionCookie(sessionCookie: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookie, {
    maxAge: SESSION_EXPIRES_MS / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

/**
 * Verify the session cookie and return the authenticated user + claims.
 * Returns null if no cookie, expired, or invalid.
 */
const getSessionUserCached = cache(async (): Promise<SessionUser | null> => {
  try {
    const store = await cookies();
    const sessionCookie = store.get(SESSION_COOKIE)?.value;
    if (!sessionCookie) return null;

    // Avoid revocation check on every request to keep navigation fast.
    // Revocation checks can be done on explicit security-sensitive actions.
    const decoded = await adminAuth().verifySessionCookie(sessionCookie);

    const claims: AppClaims = {
      role: (decoded.role as Role) ?? null,
      companyId: (decoded.companyId as string | null) ?? null,
      permissions: Array.isArray(decoded.permissions)
        ? (decoded.permissions as Permission[])
        : [],
    };

    return {
      uid: decoded.uid,
      email: decoded.email,
      ...claims,
    };
  } catch {
    return null;
  }
});

export async function getSessionUser(): Promise<SessionUser | null> {
  return getSessionUserCached();
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
