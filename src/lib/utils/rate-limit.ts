/**
 * Rate limiter with optional distributed (Upstash Redis) backing.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, limits are
 * enforced globally across all serverless instances using a fixed window in
 * Redis (no npm dependency — plain REST calls). Without them it falls back to
 * an in-process sliding window, which protects per-instance only (fine for
 * local dev and single-instance deployments).
 *
 * Redis failures fail open to the in-memory limiter so auth endpoints never
 * break because the rate-limit store is down.
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

function rateLimitInMemory(
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

let warnedRedisDown = false;

async function rateLimitRedis(
  key: string,
  limit: number,
  windowMs: number,
  url: string,
  token: string,
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  // INCR the counter, set its TTL only if it doesn't have one yet (new
  // window), then read the TTL back so resetAt reflects the real window.
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, String(windowMs), "NX"],
      ["PTTL", redisKey],
    ]),
    // Never let a slow Redis hop hold up a login request.
    signal: AbortSignal.timeout(2_000),
  });

  if (!res.ok) {
    throw new Error(`Upstash pipeline failed: ${res.status}`);
  }

  const results = (await res.json()) as Array<{ result?: unknown }>;
  const count = Number(results[0]?.result);
  const pttl = Number(results[2]?.result);
  if (!Number.isFinite(count)) {
    throw new Error("Upstash pipeline returned an unexpected payload");
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: Date.now() + (Number.isFinite(pttl) && pttl > 0 ? pttl : windowMs),
  };
}

/**
 * Check whether `key` is within the allowed rate.
 *
 * @param key      Unique identifier (e.g. IP + route)
 * @param limit    Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return await rateLimitRedis(key, limit, windowMs, url, token);
    } catch (err) {
      if (!warnedRedisDown) {
        warnedRedisDown = true;
        console.warn(
          "[rate-limit] Upstash unavailable, failing open to in-memory limits:",
          err instanceof Error ? err.message : err,
        );
      }
      // fall through to in-memory
    }
  }

  return rateLimitInMemory(key, limit, windowMs);
}

/**
 * Best-effort client IP for rate-limit keys.
 *
 * `x-forwarded-for` is client-spoofable unless a trusted proxy (Vercel,
 * Cloud Run, Firebase Hosting) strips/sets it — which all our deploy targets
 * do. Only the first (client-most) hop is used.
 */
export function getClientIp(req: { headers: Headers }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
