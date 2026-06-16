# SVY — Architecture

System overview for **SVY**, a CEFR / IELTS / Multilevel exam-prep platform for Uzbekistan.
This document is descriptive: it explains how the parts fit together. The authoritative
specs live in [`BUILD_CONTRACT.md`](./BUILD_CONTRACT.md) (build rules) and
[`DEPLOY.md`](./DEPLOY.md) (infra). For a quickstart see [`README.md`](./README.md).

---

## 1. Stack

| Layer        | Choice                                                              |
| ------------ | ------------------------------------------------------------------ |
| Framework    | **Next.js 16** (App Router, React 19, React Compiler on)           |
| Language     | **TypeScript** (strict)                                            |
| Styling      | **Tailwind CSS v3** with brand tokens (navy / sky / gold)          |
| Database     | **PostgreSQL 16** via **Prisma 6** (`@prisma/client`)              |
| Cache        | **Redis 7** (provisioned; reserved for sessions/rate-limits)       |
| Auth         | JWT (`jose`) — access + refresh cookies; bcrypt (`bcryptjs`)       |
| Validation   | **zod** (request bodies, env, the normalized-task contract)        |
| HTML parsing | **node-html-parser** (offline content importer)                   |
| Icons        | **lucide-react**                                                   |
| Runtime      | **Node 22** (Alpine), Next **standalone** output in Docker         |

There are **no extra runtime deps** beyond the above — everything (auth, OTP, parsing,
grading) is implemented in-repo under `src/lib`.

### Next.js 16 specifics (not the Next.js you remember)
- Middleware is renamed to **proxy**: the file is [`src/proxy.ts`](./src/proxy.ts), exporting
  `proxy(request)` + `config`. There is no `middleware.ts`.
- `cookies()`, `headers()`, `params` and `searchParams` are **async** (`await` them).
- Route groups `(marketing)`, `(auth)`, `(student)`, `(coach)`, `(admin)` organize files
  without affecting URLs.
- Server Components are the default; `"use client"` is added only for interactive UI.

---

## 2. Route zones

App Router under `src/app`. Route-group folders are layout boundaries, not URL segments.

| Zone          | Group         | URLs                                                              | Access            |
| ------------- | ------------- | ---------------------------------------------------------------- | ----------------- |
| Marketing/SEO | `(marketing)` | `/` · `/pricing` · `/seminars` · `/about`                        | Public            |
| Auth          | `(auth)`      | `/login` · `/register` · `/verify` · `/forgot-password` · `/reset-password` | Public         |
| Student app   | `(student)`   | `/dashboard` · `/practice` · `/test/[taskId]`                    | Any authenticated |
| Coach         | `(coach)`     | `/coach` · `/coach/upload` · `/coach/review` · `/coach/students` | OWNER/ADMIN/COACH |
| Admin         | `(admin)`     | `/admin` · `/admin/users` · `/admin/pricing` · `/admin/analytics` · `/admin/content` | OWNER/ADMIN/DEVELOPER |
| API           | `api/`        | `auth/{register,login,logout,refresh,verify-email,forgot-password,reset-password}` · `attempts` | Mixed |
| SEO           | root          | `robots.ts` · `sitemap.ts` · `not-found.tsx`                     | Public            |

Public marketing + auth pages export `metadata` for SEO. The student/coach/admin zones are
gated by the proxy (see §3).

---

## 3. RBAC

Roles mirror the Prisma `Role` enum and are defined once in [`src/lib/rbac.ts`](./src/lib/rbac.ts).

### Roles
`OWNER` · `ADMIN` · `COACH` · `DEVELOPER` · `STUDENT`

### Permission matrix
`can(role, permission)` is the single source of truth. Summary:

| Permission         | OWNER | ADMIN | COACH | DEVELOPER | STUDENT |
| ------------------ | :---: | :---: | :---: | :-------: | :-----: |
| content:view       |   ✓   |   ✓   |   ✓   |     ✓     |    ✓    |
| task:create        |   ✓   |   ✓   |   ✓   |           |         |
| task:publish       |   ✓   |   ✓   |       |           |         |
| task:moderate      |   ✓   |   ✓   |       |           |         |
| task:import        |   ✓   |   ✓   |       |     ✓     |         |
| student:view-own   |       |       |   ✓   |           |         |
| student:view-all   |   ✓   |   ✓   |       |           |         |
| user:manage        |   ✓   |   ✓   |       |           |         |
| pricing:manage     |   ✓   |       |       |           |         |
| billing:view       |   ✓   |       |       |           |         |
| analytics:view     |   ✓   |   ✓   |       |           |         |
| seminar:manage     |   ✓   |   ✓   |   ✓   |           |         |
| system:admin       |   ✓   |       |       |     ✓     |         |

Notes baked into the matrix:
- **COACH** can author tasks but cannot publish — coach-created content goes through
  moderation (`PENDING_REVIEW` → `task:moderate`).
- **ADMIN** runs the platform but **money stays with OWNER** — no `pricing:manage`/`billing:view`.
- **DEVELOPER** gets technical access (`system:admin`, `task:import`) but no personal data
  and no pricing.

### Where it is enforced
- **Edge / proxy** — [`src/proxy.ts`](./src/proxy.ts) verifies the access JWT (jose only, no
  Prisma) and checks `ZONE_ROLES` for guarded prefixes: `/admin` (OWNER/ADMIN/DEVELOPER),
  `/coach` (OWNER/ADMIN/COACH), `/dashboard` + `/practice` (any authed). Unauthenticated →
  `/login?next=…`; wrong role → `homeForRole(role)`.
- **Server** — `requireUser()` / `requireRole(...)` in
  [`src/lib/auth/session.ts`](./src/lib/auth/session.ts) guard server components & actions.
- `homeForRole(role)` decides the post-login landing zone (OWNER/ADMIN/DEVELOPER → `/admin`,
  COACH → `/coach`, STUDENT → `/dashboard`).

---

## 4. Auth flow (email-OTP)

Registration verifies via a **6-digit code emailed** to the user — chosen over SMS to avoid
gateway costs in Uzbekistan. Phone is stored but **not** SMS-verified.

### Registration
1. `POST /api/auth/register` — zod-validate first/last name, email, **+998** phone, password.
   Email & phone are UNIQUE (friendly pre-check + DB unique index handles the race, `P2002`).
2. Create the `User` (role `STUDENT`, `emailVerified = null`), bcrypt the password.
3. `issueCode(email, EMAIL_VERIFY)` — CSPRNG 6-digit code, **only its hash** stored in
   `VerificationCode`; prior unconsumed codes for that (email, purpose) are invalidated.
4. `sendVerificationEmail(email, code)` — see §4.1. A send failure does **not** 500 the signup.
5. No session yet → client moves to `/verify`.

### Verification & token issuance
- `/verify` → `POST /api/auth/verify-email`. `verifyCode` checks the latest unconsumed code:
  **10-minute TTL**, **max 5 attempts** (code is burned on cap or success). On success,
  `emailVerified` is set and access + refresh tokens are issued.

### Login
- `POST /api/auth/login` → `verifyPassword` → `setAuthCookies(access, refresh)` → redirect to
  `homeForRole`.

### Tokens (`jose`, HS256)
- **Access** ~15m, claims `{ sub, role, type:'access' }` — read by the proxy at the edge.
- **Refresh** ~30d, claims `{ sub, sid, type:'refresh' }` — `sid` points at a `Session` row;
  rotation/revocation is row-driven (a missing/revoked row invalidates the refresh JWT).
- Both are `httpOnly`, `sameSite=lax`, `secure` in production. `POST /api/auth/refresh`
  rotates; `POST /api/auth/logout` clears cookies.

### Password reset
- `/forgot-password` → `POST /api/auth/forgot-password` issues a `PASSWORD_RESET` code (same
  `VerificationCode` model/TTL) → `/reset-password` submits code + new password.

### 4.1 Email delivery
[`src/lib/email.ts`](./src/lib/email.ts) is a **provider-agnostic stub** with a single
`deliver()` seam. If `SMTP_*` env vars are present it logs that a real send would happen;
otherwise it prints the code to the server console so dev/local flows work end-to-end.
Wiring a real transport (e.g. nodemailer) is a one-function change — credentials come from
env, never the repo.

> Google OAuth ("Continue with Google") is **phase 2** — the button exists, disabled.

---

## 5. Data model

Source of truth: [`prisma/schema.prisma`](./prisma/schema.prisma) (PostgreSQL). Groups:

- **Users & auth** — `User` (email/phone unique, role, optional `cefrLevel`,
  `emailVerified`/`phoneVerified`), `Session` (refresh rotation), `VerificationCode`
  (email-OTP, purpose `EMAIL_VERIFY`|`PASSWORD_RESET`, `codeHash`), `CoachStudent` (coach↔student).
- **Billing** — `Plan` (code/price/period/perks), `PriceHistory` (audit, lets us grandfather),
  `PromoCode` (percent/fixed), `Subscription` (status, **`priceUzsAtPurchase`** = grandfathered
  price, `currentPeriodEnd`).
- **Content** — `Task` (slug, `track`, `skill`, `type`, `status`, optional `cefrLevel` /
  IELTS band range, `passageHtml`, `audioUrl`, `transcript`, author), `QuestionGroup` (a
  "Questions 1–5" block with shared `data` Json), `Question` (`type` + `data` Json +
  `answer` Json + `points`).
- **Attempts & progress** — `Attempt` (status, `score`, `bandEstimate`), `Answer`
  (`response` Json, `isCorrect`, `feedback`), `SkillProgress` (denormalized per
  user/track/skill for fast dashboards), `PlacementResult`.
- **Seminars** — `Seminar` (platform: Meet/YouTube/Zoom/Jitsi, `joinUrl`, `scheduledAt`,
  `isFree`), `SeminarRegistration`.
- **Phase-2 content** — `VocabSet`/`VocabWord`, `GrammarLesson`.

Key enums: `Track` (IELTS/CEFR/MULTILEVEL), `Skill` (LISTENING/READING/SPEAKING/WRITING),
`TaskStatus` (DRAFT/PENDING_REVIEW/PUBLISHED/REJECTED/ARCHIVED), `CefrLevel` (A1–C2),
and the 14-value `QuestionType` (TF/NG, YN/NG, MCQ, multi-select, matching, headings,
the completion family, short-answer, labelling, plus `ESSAY` / `SPEAKING_PROMPT` for
human/AI-graded skills).

### Grading & attempts
`POST /api/attempts` (auth required) creates an `Attempt`, auto-grades every **objective**
question against its stored `answer` via [`src/lib/grade.ts`](./src/lib/grade.ts), persists
`Answer` rows in a transaction, and returns score, percent, per-question correctness, and —
for IELTS tasks — a band estimate (`ieltsBandFromRaw`). `ESSAY` / `SPEAKING_PROMPT` are stored
and flagged needs-grading (the attempt stays `SUBMITTED` rather than `GRADED`); AI/coach
grading of those is phase 2.

---

## 6. Content pipeline (HTML → parser → import)

SVY is **IELTS-first**: its initial corpus is a pile of standalone, self-grading IELTS
practice HTML pages authored by many people with no single template. They are normalized to
one portable JSON contract and imported.

```
 raw HTML pages ──► parseHtmlTask() ──► NormalizedTask (zod) ──► <slug>.json + index.json ──► DB
 (../svy-ielts/      src/lib/parser/      src/types/task.ts        scripts/parse-tests.ts      (seed/
  test-imports)      html.ts                                       (offline, run with tsx)      import)
```

- **Parser** — [`src/lib/parser/html.ts`](./src/lib/parser/html.ts) handles two source
  families: (1) **static-DOM** pages where the passage/questions are real DOM and the answer
  key is a JS object in a `<script>` (`correctAnswers = {...}`); (2) **CONFIG-driven** pages
  where a single `CONFIG = { sections: [...] }` object carries the richest structure. It
  detects skill, infers `QuestionType` per group, and is **best-effort** — it never throws;
  ambiguity becomes a warning, only an unusable file is an error.
- **Contract** — every importer normalizes to `NormalizedTask` in
  [`src/types/task.ts`](./src/types/task.ts), validated by `normalizedTaskSchema` (zod). This
  is the portable JSON shape: parser output → seed/import → DB, mirroring the Prisma models.
- **Batch importer** — [`scripts/parse-tests.ts`](./scripts/parse-tests.ts) reads every
  `*.html` in an input dir, validates each, writes one `<slug>.json` per file plus an
  `index.json` summary, and prints an OK/WARN/FAIL report. It runs **offline** (`tsx`), never
  in the request path — important because the answer-key reader evaluates author-written JS
  literals, gated by a pure-data check.
- **Moderation** — imported and coach-authored tasks land as `DRAFT`/`PENDING_REVIEW` and only
  become visible once `PUBLISHED` (coaches need `task:moderate` approval; admins can publish).

---

## 7. Deploy & infra

Single-host Compose for dev; Railway + Cloudflare for production. Full steps in
[`DEPLOY.md`](./DEPLOY.md).

- **Local** — `docker-compose.yml` runs `web` + `postgres:16-alpine` + `redis:7-alpine`. The
  web container reaches siblings by service name (`postgres:5432`, `redis:6379`). The
  `Makefile` wraps the common commands (`make up`, `db-push`, `db-seed`, `logs`, `clean`).
- **Image** — multi-stage `Dockerfile` (Node 22 Alpine) producing Next **standalone** output
  (`node server.js`), running as a non-root user, shipping the Prisma schema + generated
  client so migrations/seed can run in-container.
- **Production** — Railway hosts the app container + managed Postgres + Redis
  (`DATABASE_URL`/`REDIS_URL` referenced from the plugins). Cloudflare provides DNS / CDN /
  TLS (Full strict), with `NEXT_PUBLIC_APP_URL` set to the public origin.
- **DB workflow** — dev uses `prisma db push`; production uses committed migrations
  (`prisma migrate deploy`). The seed (`prisma/seed.ts`) is **idempotent** (upsert on unique
  keys) and creates 3 plans, 3 demo users (OWNER/COACH/STUDENT, `svy12345`), and 2 free
  seminars. **Remove/rotate the demo accounts before go-live.**
- **Config** — environment is zod-validated in [`src/lib/env.ts`](./src/lib/env.ts) with safe
  dev defaults; secrets (`JWT_*`, `SMTP_PASS`, `R2_*`, `GOOGLE_CLIENT_SECRET`,
  `ANTHROPIC_API_KEY`) belong in Railway variables, never the repo.

---

## 8. MVP vs phase 2

**In the MVP (built):**
- Marketing site, pricing (monthly **20,000 UZS**/mo + quarterly/yearly), seminars, about.
- Email-OTP registration + verification, login, logout, refresh, password reset.
- RBAC across five roles, edge proxy guards + server guards.
- Student dashboard, practice browser, test player (`/test/[taskId]`) with auto-grading and
  IELTS band estimates.
- Coach zone (upload / review / students) and admin zone (users / pricing / analytics /
  content).
- IELTS-first HTML→JSON content pipeline + offline batch importer.
- Docker / Compose / Railway / Cloudflare deploy path.

**Phase 2 (scaffolded, not wired):**
- **Payments / paywall enforcement** — `Plan`/`Subscription`/`PromoCode` model exists; the
  20k UZS subscription is not yet charged or gated by a payment provider.
- **Google OAuth** — disabled "Continue with Google" button; `GOOGLE_*` env reserved.
- **Real SMTP** — `email.ts` stub logs codes; transport wired when the founder's mailbox is ready.
- **AI grading** of `ESSAY` / `SPEAKING_PROMPT` (`ANTHROPIC_API_KEY` reserved); coach grading UI.
- **Cloudflare R2** audio/media storage for listening (`R2_*` env reserved; `audioUrl` field exists).
- **CEFR / Multilevel content**, vocabulary trainer (`VocabSet`), grammar lessons
  (`GrammarLesson`), placement test scoring, and Redis-backed sessions / rate-limits.
