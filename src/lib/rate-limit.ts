import { env } from '@/lib/env'

/**
 * Dependency-free sliding-window rate limiter (BUILD_CONTRACT — no new npm deps).
 *
 * Why a sliding window (not a fixed window):
 *   A fixed window resets the counter on a hard boundary, which lets an attacker
 *   send `limit` requests at the end of one window and `limit` more at the start
 *   of the next — up to 2×limit in a moment. A sliding window keeps the actual
 *   timestamps of recent hits and only counts those inside `[now - windowMs, now]`,
 *   so the limit holds at every instant.
 *
 * Storage:
 *   The default backend is an in-process `Map<key, number[]>` of hit timestamps.
 *   This is correct and fast for a SINGLE instance (one Node process). It does NOT
 *   share state across instances — each replica keeps its own counts, so a request
 *   that lands on a different replica is counted separately.
 *
 *   TODO(scale): back this with Redis (`env.REDIS_URL`) for multi-instance /
 *   serverless deployments. See `src/lib/security/README.md` for a drop-in
 *   `INCR`/`ZADD`-based implementation. The exported `rateLimit()` signature is
 *   intentionally stable so swapping the backend needs no caller changes.
 *
 * Usage (route handler, BUILD_CONTRACT §7 — apply at the top of auth routes):
 *   const ip = ipFromRequest(request)
 *   const rl = rateLimit(`login:${ip}`, 5, 60_000)   // 5 attempts / minute
 *   if (!rl.ok) return tooManyRequests(rl.retryAfter)
 */

export interface RateLimitResult {
  /** True when the request is within budget and may proceed. */
  ok: boolean
  /** Requests still allowed in the current window (0 when blocked). */
  remaining: number
  /** Seconds until at least one slot frees up — use for the `Retry-After` header. */
  retryAfter: number
}

/**
 * Per-key ring of hit timestamps (ms epoch). Kept newest-last. We prune entries
 * older than the window on every read so memory stays bounded by active traffic.
 */
const store = new Map<string, number[]>()

/**
 * Periodically drop keys whose every timestamp has aged out, so idle/expired keys
 * don't leak memory in a long-running process. Invoked from `rateLimit()` and
 * self-throttled to run at most once per sweep window — no background timer, so it
 * adds no work on idle and nothing holds the process open.
 */
const SWEEP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
let lastSweep = 0

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, hits] of store) {
    // The largest (most recent) timestamp gates whether the key is still active.
    const newest = hits[hits.length - 1]
    if (newest === undefined || now - newest >= SWEEP_INTERVAL_MS) {
      store.delete(key)
    }
  }
}

/**
 * Record one hit for `key` and decide whether it is allowed.
 *
 * @param key      Caller-built identity, e.g. `"login:1.2.3.4"`. Combine the route
 *                 and the client IP so each endpoint has its own budget.
 * @param limit    Max requests permitted within the window (must be ≥ 1).
 * @param windowMs Sliding window length in milliseconds.
 *
 * Note: marked async so the Redis-backed implementation can replace it without
 * changing any caller (`await rateLimit(...)` already works today).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now()
  sweep(now)

  const windowStart = now - windowMs
  const previous = store.get(key) ?? []

  // Drop timestamps that have slid out of the window.
  const recent = previous.filter((ts) => ts > windowStart)

  if (recent.length >= limit) {
    // Blocked: the oldest in-window hit determines when a slot reopens.
    const oldest = recent[0]
    const retryAfterMs = oldest + windowMs - now
    // Don't grow the array while blocked — that would push the reset out forever.
    store.set(key, recent)
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    }
  }

  recent.push(now)
  store.set(key, recent)

  return {
    ok: true,
    remaining: limit - recent.length,
    retryAfter: 0,
  }
}

/**
 * Best-effort client IP from a Web `Request` (route handlers use Web Request in
 * Next.js 16). Honours common proxy headers, then falls back to a constant so a
 * missing IP can't bypass the limiter — a shared bucket is safer than no bucket.
 *
 * SECURITY: `x-forwarded-for` is client-spoofable unless a trusted proxy sets it.
 * On Vercel/most platforms the platform overwrites it at the edge, so the FIRST
 * entry is the real client. If you self-host behind your own proxy, ensure it
 * rewrites this header rather than appending to it.
 */
export function ipFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Reference to env.REDIS_URL so the intended Redis backend is discoverable from
 * this module and not tree-shaken out of awareness. The in-memory path above is
 * used until the Redis implementation in the README replaces `store`.
 */
export const RATE_LIMIT_REDIS_URL = env.REDIS_URL
