"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut as fbSignOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth.store";

/**
 * Ends the visit silently when the client Firebase session disappears while a
 * protected page is open (expired or revoked session): clears the client auth
 * state and the httpOnly session cookie, then sends the user back to the
 * login page so they can simply sign in again — no "session expired" banner.
 *
 * Mount once inside protected layouts (dashboard, admin).
 */
export function SessionEndedSignOut() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const endedRef = useRef(false);

  useEffect(() => {
    if (loading || user || endedRef.current) return;

    // Right after login the client user can be momentarily null while the SDK
    // restores the session (a transient accounts:lookup race) — wait out a
    // short grace window first. When the user arrives this effect re-runs and
    // the timer is cleared before it can fire.
    const graceTimer = setTimeout(async () => {
      endedRef.current = true;
      await fbSignOut(getFirebaseAuth()).catch(() => undefined);
      await fetch("/api/auth/session", { method: "DELETE" }).catch(
        () => undefined,
      );
      // `reauth=1` lets the login page render even if a stale cookie survived
      // the DELETE, avoiding a redirect loop through the middleware.
      router.replace(`${ROUTES.LOGIN}?reauth=1`);
      router.refresh();
    }, 2500);

    return () => clearTimeout(graceTimer);
  }, [loading, user, router]);

  return null;
}
