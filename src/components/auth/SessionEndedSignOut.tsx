"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut as fbSignOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth.store";

/**
 * Ends the visit silently when the session has genuinely expired, sending the
 * user back to the login page (no "session expired" banner).
 *
 * IMPORTANT: the client Firebase user can go null transiently — a token
 * refresh, a backgrounded tab, a network blip — which is NOT proof the session
 * ended. Treating that as a logout used to sign active users out at random.
 * So when the client user disappears we wait a grace window and then ask the
 * SERVER: only a real 401 (the httpOnly session cookie is gone/expired) ends
 * the visit. If the server still has a valid session, we leave the user alone.
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

    let cancelled = false;
    const graceTimer = setTimeout(async () => {
      if (cancelled) return;

      // Confirm with the server before doing anything destructive.
      let sessionGone = false;
      try {
        const res = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });
        sessionGone = res.status === 401;
      } catch {
        // Can't reach the server → don't sign the user out on a guess.
        return;
      }

      // Server session is still valid: this was a transient client blip. Leave
      // the user signed in.
      if (cancelled || !sessionGone) return;

      endedRef.current = true;
      await fbSignOut(getFirebaseAuth()).catch(() => undefined);
      await fetch("/api/auth/session", { method: "DELETE" }).catch(
        () => undefined,
      );
      // `reauth=1` lets the login page render even if a stale cookie survived
      // the DELETE, avoiding a redirect loop through the middleware.
      router.replace(`${ROUTES.LOGIN}?reauth=1`);
      router.refresh();
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(graceTimer);
    };
  }, [loading, user, router]);

  return null;
}
