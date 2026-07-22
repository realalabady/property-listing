"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut as fbSignOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth.store";
import { IDLE_TIMEOUT_MS } from "@/constants/session";

/**
 * Client-side inactivity watchdog for protected areas.
 *
 * The middleware idle check only runs on full navigations to protected routes —
 * it never sees SPA transitions, client Firestore reads, or `/api` calls. And
 * the Firebase client SDK keeps its user (and token) alive indefinitely, so the
 * store's `user` never goes null on its own. Result before this: an idle user is
 * left sitting on the page, and once the server session lapses every click just
 * spins on silent 401s.
 *
 * This watchdog tracks real interaction and, after {@link IDLE_TIMEOUT_MS} with
 * none, ends the visit: Firebase sign-out + server cookie DELETE, then a redirect
 * to the login page with `idle=1` so it can explain that the session ended.
 *
 * Mount once inside protected layouts (dashboard, admin), alongside
 * `SessionEndedSignOut`.
 */
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

// Refresh the server's activity timestamp at most this often. Real interaction
// fires activity events continuously; we only need to keep the middleware's
// `sess_activity` cookie fresh, so one lightweight beat per minute is plenty.
const HEARTBEAT_INTERVAL_MS = 60_000;

export function IdleTimeout() {
  const router = useRouter();
  // Key the effect on the uid only: the store's `user` object changes identity
  // on every ID-token refresh (~hourly), and re-running the effect would reset
  // `lastActivity` and could keep re-arming the AFK countdown forever. The uid
  // is stable for the life of the sign-in.
  const uid = useAuthStore((s) => s.user?.uid);

  useEffect(() => {
    // Only guard an actually-signed-in session.
    if (!uid) return;

    let ended = false;
    let lastActivity = Date.now();
    let lastBeat = 0;

    // Keep the SERVER's idle window in sync with real activity. The middleware
    // only refreshes `sess_activity` on full navigations, but in-view work
    // (forms, the pipeline board, filtering) is all API/Firestore traffic that
    // bypasses it — without this beat an active user's server timestamp goes
    // stale and their next navigation would wrongly log them out.
    const heartbeat = () => {
      const now = Date.now();
      if (now - lastBeat < HEARTBEAT_INTERVAL_MS) return;
      lastBeat = now;
      void fetch("/api/auth/activity", {
        method: "POST",
        cache: "no-store",
        keepalive: true,
      }).catch(() => undefined);
    };

    // Cheap: activity fires rapidly, so just stamp the time (and throttle a
    // server heartbeat) — no timer churn.
    const bump = () => {
      lastActivity = Date.now();
      heartbeat();
    };

    // Align the server timestamp with the moment this watchdog mounts.
    heartbeat();

    async function endSession() {
      if (ended) return;
      ended = true;
      await fbSignOut(getFirebaseAuth()).catch(() => undefined);
      // Clears both the __session and sess_activity cookies server-side.
      await fetch("/api/auth/session", { method: "DELETE" }).catch(
        () => undefined,
      );
      // `reauth=1` lets the login page render even if a stale cookie survives the
      // DELETE (avoids a middleware redirect loop); `idle=1` shows the notice.
      router.replace(`${ROUTES.LOGIN}?reauth=1&idle=1`);
      router.refresh();
    }

    function checkIdle() {
      if (ended) return;
      if (Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        void endSession();
      }
    }

    // Poll on an interval rather than one long setTimeout: robust to background
    // tab throttling and clock drift, and avoids re-arming a timer on every
    // mouse move. Worst case the sign-out lands one interval late.
    const interval = setInterval(checkIdle, 30_000);

    // Returning to a tab that sat idle past the window should sign out promptly,
    // not wait for the next interval tick — but coming back is NOT activity.
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkIdle();
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, bump, { passive: true }),
    );
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, bump));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [uid, router]);

  return null;
}
