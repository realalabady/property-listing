/**
 * Simple in-process sliding-window rate limiter.
 *
 * Works per-serverless-instance. For multi-instance deployments pair this
 * with a shared KV store (Upstash Redis, Vercel KV, etc.) for global limits.
 * As-is it provides effective protection against single-client burst traffic
 * on each instance.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

/** Purge keys whose window has expired to prevent unbounded memory growth. */
function purgeExpired(): void {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetAt <= now) store.delete(key);
  }
}

let purgeInterval: ReturnType<typeof setInterval> | undefined;
if (typeof setInterval !== "undefined") {
  purgeInterval = setInterval(purgeExpired, 60_000);
  // Don't block process exit
  if (purgeInterval.unref) purgeInterval.unref();
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Unix ms when the current window resets. */
  resetAt: number;
}

/**
 * Check whether `key` is within the allowed rate.
 *
 * @param key      Unique identifier (e.g. IP + route)
 * @param limit    Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let win = store.get(key);

  if (!win || win.resetAt <= now) {
    win = { count: 0, resetAt: now + windowMs };
    store.set(key, win);
  }

  win.count += 1;
  const remaining = Math.max(0, limit - win.count);

  return {
    allowed: win.count <= limit,
    remaining,
    resetAt: win.resetAt,
  };
}
