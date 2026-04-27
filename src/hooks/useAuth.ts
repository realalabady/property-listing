"use client";

import { useEffect } from "react";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/user";
import type { Role } from "@/constants/roles";
import type { Permission } from "@/constants/permissions";

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

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signIn: async (email: string, password: string) => {
      const cred = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
      );
      const idToken = await cred.user.getIdToken(true);
      // Exchange ID token for server session cookie
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      return cred.user;
    },
    signUp: async (email: string, password: string) => {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
      );
      const idToken = await cred.user.getIdToken(true);
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      return cred.user;
    },
    signOut: async () => {
      await fbSignOut(getFirebaseAuth());
      await fetch("/api/auth/session", { method: "DELETE" });
    },
  };
}
