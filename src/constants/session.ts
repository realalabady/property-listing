/**
 * Idle-timeout window shared by the client watchdog (`IdleTimeout`) and the
 * server-side middleware. After this many minutes without ANY user
 * interaction the session is force-ended: the user is signed out and sent to
 * the login page with a "your session ended" notice.
 *
 * Keep the client value (`NEXT_PUBLIC_SESSION_IDLE_MINUTES`) and the middleware
 * value (`SESSION_IDLE_MINUTES`) in sync if you override the default.
 */
export const IDLE_TIMEOUT_MINUTES =
  Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES) || 20;

export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;
