# SVY security helpers

Two dependency-free helpers and how to wire them. **The orchestrator applies these
— the auth route handlers and `next.config.ts` are not edited here.**

- `@/lib/rate-limit` — sliding-window limiter (`rateLimit`, `ipFromRequest`).
- `@/lib/security/headers` — recommended HTTP security headers for `next.config.ts`.

---

## 1. Rate limiting the auth routes

Apply `rateLimit` at the **top** of the auth route handlers, before touching the DB.
Key each bucket by `route:ip` so endpoints don't share a budget. Suggested limits:

| Route                         | Key prefix        | Limit | Window  | Why                                   |
| ----------------------------- | ----------------- | ----- | ------- | ------------------------------------- |
| `POST /api/auth/login`        | `login`           | 5     | 60 s    | Throttle credential stuffing.         |
| `POST /api/auth/register`     | `register`        | 5     | 60 s    | Stop bulk fake-account creation.      |
| `POST /api/auth/forgot-password` | `forgot`       | 3     | 600 s   | OTP email = cost; cap reset spam.     |

> These limits are per **instance** (in-memory). They are correct on one Node
> process; for multiple replicas / serverless, switch to Redis (section 3).

### Pattern

```ts
// src/app/api/auth/login/route.ts  (Next.js 16 route handler — Web Request/Response)
import { NextResponse } from 'next/server'
import { rateLimit, ipFromRequest } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validators/auth'

export async function POST(request: Request) {
  // 1) Rate limit FIRST — cheap, and blocks abuse before any DB work.
  const ip = ipFromRequest(request)
  const rl = await rateLimit(`login:${ip}`, 5, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  // 2) Then validate + handle as normal.
  const body = await request.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // ...verifyPassword, setAuthCookies, etc.
  return NextResponse.json({ ok: true })
}
```

`/register` and `/forgot-password` are identical — only the **key prefix**, **limit**,
and **window** change:

```ts
// register/route.ts
const rl = await rateLimit(`register:${ipFromRequest(request)}`, 5, 60_000)

// forgot-password/route.ts  (tighter: OTP emails cost money)
const rl = await rateLimit(`forgot:${ipFromRequest(request)}`, 3, 600_000)
```

> Optional hardening for `forgot-password`: also key by the submitted email
> (`forgot:${email}`) so one IP can't burn through reset codes for many accounts.
> Run that check **after** zod validation since it needs the parsed body.

### Return shape

`rateLimit(key, limit, windowMs)` → `{ ok, remaining, retryAfter }`:

- `ok` — `false` when over budget; return **HTTP 429**.
- `remaining` — slots left this window (handy for `X-RateLimit-Remaining`).
- `retryAfter` — **seconds** until a slot frees; put it in the `Retry-After` header.

---

## 2. Security headers in `next.config.ts`

`securityHeaders()` returns `{ key, value }[]`, ready to spread into Next's
`headers()`. CSP ships **Report-Only** by default — flip `enforce: true` once the
violation reports are clean.

```ts
// next.config.ts  (orchestrator applies this — do not edit it from a helper task)
import type { NextConfig } from 'next'
import { securityHeaders } from '@/lib/security/headers'

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        // Apply to every route.
        source: '/:path*',
        headers: securityHeaders(), // Report-Only CSP; pass { enforce: true } to enforce.
      },
    ]
  },
}

export default nextConfig
```

Notes:

- `headers()` runs at config load (Node), so importing from `@/lib/security/headers`
  is fine — the module is pure and pulls in no client/runtime-only code.
- Start in Report-Only, watch the browser console / your report endpoint, then
  switch to `securityHeaders({ enforce: true })`.
- When you add third-party origins (analytics, a payments SDK, an SMTP web API),
  widen the matching directive in `buildCsp()` (`headers.ts`) — allow-list the
  **exact** origin, never a wildcard.
- HSTS only activates over HTTPS; it's inert on `localhost`.

---

## 3. Where Redis plugs in (multi-instance)

The in-memory `Map` in `rate-limit.ts` is per-process: each replica counts
independently, so the effective limit scales with the number of instances. For
multiple replicas or serverless, back the limiter with Redis at `env.REDIS_URL`
(already in `@/lib/env`).

The `rateLimit()` signature stays the same — only its body changes — so **no caller
edits are needed**. Sliding-window with a Redis sorted set (`ZADD`/`ZREMRANGEBYSCORE`):

```ts
// Sketch — requires a Redis client dep (e.g. ioredis), which is out of scope for
// this no-deps task. Wire it when scaling past one instance.
//
// import Redis from 'ioredis'
// import { env } from '@/lib/env'
// const redis = new Redis(env.REDIS_URL)
//
// export async function rateLimit(key, limit, windowMs) {
//   const now = Date.now()
//   const windowStart = now - windowMs
//   const k = `rl:${key}`
//   const pipe = redis.multi()
//   pipe.zremrangebyscore(k, 0, windowStart)        // drop old hits
//   pipe.zadd(k, now, `${now}-${Math.random()}`)    // record this hit (unique member)
//   pipe.zcard(k)                                   // count hits in window
//   pipe.pexpire(k, windowMs)                        // auto-clean idle keys
//   const res = await pipe.exec()
//   const count = Number(res?.[2]?.[1] ?? 0)
//   const ok = count <= limit
//   return { ok, remaining: Math.max(0, limit - count), retryAfter: ok ? 0 : Math.ceil(windowMs / 1000) }
// }
```

Notes for the Redis version:

- Use one client per process (module singleton), not per request.
- `PEXPIRE` on each write keeps idle keys from accumulating.
- The sorted-set score is the timestamp; members must be unique (append a random
  suffix) so concurrent hits in the same millisecond aren't collapsed.
- Fail **open** on a Redis outage (allow the request, log it) so the limiter can't
  take down auth — but alert, since limits are off until Redis recovers.
