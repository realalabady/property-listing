"use client";

import { useEffect } from "react";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  type User as FirebaseUser,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/user";
import type { Role } from "@/constants/roles";
import type { Permission } from "@/constants/permissions";

interface SessionApiError {
  code?: string;
  error?: string;
}

function mapFirebaseAuthError(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "Authentication failed. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/weak-password":
      return "Password is too weak. Please choose a stronger password.";
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a minute and try again.";
    case "auth/operation-not-allowed":
      return "Sign-in is currently unavailable.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection and try again.";
    default:
      return "Authentication failed. Please try again.";
  }
}

function mapFirebaseUser(
  fbUser: FirebaseUser,
  claims: Record<string, unknown>,
): AuthUser {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    phoneNumber: fbUser.phoneNumber,
    emailVerified: fbUser.emailVerified,
    role: (claims.role as Role) ?? null,
    companyId: (claims.companyId as string) ?? null,
    permissions: Array.isArray(claims.permissions)
      ? (claims.permissions as Permission[])
      : [],
  };
}

/**
 * Subscribe the Zustand auth store to Firebase Auth state + token changes.
 * Must be mounted ONCE in the root layout (e.g. via <AuthBootstrap />).
 */
export function useAuthBootstrap(): void {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      const tokenResult = await fbUser.getIdTokenResult();
      setUser(mapFirebaseUser(fbUser, tokenResult.claims));
      setLoading(false);
    });

    // Re-read claims whenever the ID token refreshes (role change, reauth, etc.)
    const unsubToken = onIdTokenChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      const tokenResult = await fbUser.getIdTokenResult(true);
      setUser(mapFirebaseUser(fbUser, tokenResult.claims));
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, [setUser, setLoading]);
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  const exchangeIdTokenForSession = async (idToken: string): Promise<void> => {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (res.ok) return;

    let payload: SessionApiError | null = null;
    try {
      payload = (await res.json()) as SessionApiError;
    } catch {
      payload = null;
    }

    if (res.status === 429) {
      throw new Error("Too many attempts. Please wait a minute and try again.");
    }

    if (payload?.code === "SERVER_AUTH_CONFIG_MISSING") {
      throw new Error("Sign-in service is temporarily unavailable.");
    }

    throw new Error("Unable to start your session. Please try again.");
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signIn: async (email: string, password: string) => {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(
          getFirebaseAuth(),
          email,
          password,
        );
      } catch (error) {
        throw new Error(mapFirebaseAuthError(error));
      }
      try {
        const idToken = await cred.user.getIdToken(true);
        await exchangeIdTokenForSession(idToken);
      } catch (error) {
        await fbSignOut(getFirebaseAuth()).catch(() => undefined);
        throw error;
      }
      return cred.user;
    },
    signUp: async (_email: string, _password: string) => {
      throw new Error(
        "Self-service registration is disabled. Contact the platform owner for account access.",
      );
    },
    signOut: async () => {
      await fbSignOut(getFirebaseAuth());
      await fetch("/api/auth/session", { method: "DELETE" });
    },
  };
}
