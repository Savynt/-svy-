# SVY

**SVY** is a CEFR / IELTS / Multilevel exam-prep platform for Uzbekistan. Learners practice
Listening, Reading, Speaking and Writing with auto-graded tests and IELTS band estimates;
coaches author and review content; admins manage users, pricing and analytics. Built
**IELTS-first**, with a subscription model (monthly **20,000 UZS**).

Brand: open-book "SVY" mark — deep **navy** ink on soft **sky-blue**, warm **gold** accent.

| | |
| --- | --- |
| **Stack** | Next.js 16 (App Router, React 19) · TypeScript (strict) · Tailwind v3 · PostgreSQL 16 + Prisma 6 · Redis 7 · JWT (`jose`) · zod |
| **Runtime** | Node 22 · Docker (Next standalone) |
| **Hosting** | Railway (app + Postgres + Redis) behind Cloudflare (DNS/CDN/TLS) |

> **Heads-up: this is Next.js 16.** Middleware is renamed to **proxy** (`src/proxy.ts`, no
> `middleware.ts`); `cookies()`/`headers()`/`params`/`searchParams` are **async**; Server
> Components are the default. See [`BUILD_CONTRACT.md`](./BUILD_CONTRACT.md) before writing code.

---

## Quickstart (Docker)

Prerequisites: Docker Desktop (or Docker Engine + Compose v2). Full guide in
[`DEPLOY.md`](./DEPLOY.md).

```bash
# 1. Create your env file from the template and fill in secrets.
cp .env.example .env

# 2. Build + start web + postgres + redis (web waits for healthy db/redis).
make up

# 3. Create the schema, then seed demo data (idempotent).
make db-push
make db-seed

# 4. Open the app.
#    http://localhost:3000
```

### Demo accounts (from the seed)

| Email            | Role    | Password   |
| ---------------- | ------- | ---------- |
| `owner@svy.uz`   | OWNER   | `svy12345` |
| `coach@svy.uz`   | COACH   | `svy12345` |
| `student@svy.uz` | STUDENT | `svy12345` |

All three have `emailVerified` set, so you can log in immediately.
**Remove or rotate these before going live.**

### Run on the host (without Docker)

You still need a reachable Postgres + Redis (point `DATABASE_URL` / `REDIS_URL` at them).

```bash
npm install            # runs `prisma generate` via postinstall
npm run dev            # Next dev server on http://localhost:3000
```

---

## Scripts & commands

### npm (`package.json`)

| Command         | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start the Next dev server             |
| `npm run build` | Production build (standalone output)  |
| `npm run start` | Serve the production build            |
| `npm run lint`  | ESLint                                |

> Prisma DB scripts (`db:push` / `db:migrate` / `db:seed`) and the `prisma.seed` runner are
> added by the orchestrator before the first build — see [`DEPLOY.md`](./DEPLOY.md).

### Make (`Makefile`, wraps docker compose)

| Command          | What it does                                       |
| ---------------- | -------------------------------------------------- |
| `make up`        | Build + start the stack in the background          |
| `make down`      | Stop containers (keeps Postgres/Redis volumes)     |
| `make db-push`   | Push `schema.prisma` to the DB (dev)               |
| `make db-migrate`| Apply committed migrations (prod-style)            |
| `make db-seed`   | Seed/refresh demo data (idempotent)                |
| `make logs`      | Tail logs from all services                        |
| `make sh`        | Shell into the `web` container                     |
| `make clean`     | Stop **and delete data volumes** (full reset)      |

### Content importer

Offline batch parser that turns IELTS HTML pages into the unified task JSON
(`NormalizedTask`). Runs with `tsx`, never in the request path:

```bash
npx tsx scripts/parse-tests.ts [inputDir] [outputDir]
```

It writes one `<slug>.json` per page plus an `index.json` summary and prints an OK/WARN/FAIL
report. See [`ARCHITECTURE.md` §6](./ARCHITECTURE.md) for the pipeline.

---

## Folder structure

```
svy-platform/
├─ prisma/
│  ├─ schema.prisma        # data model — single source of truth (Postgres)
│  └─ seed.ts              # idempotent seed: 3 plans, 3 demo users, 2 seminars
├─ scripts/
│  └─ parse-tests.ts       # offline HTML → NormalizedTask batch importer
├─ src/
│  ├─ proxy.ts             # Next 16 proxy (edge auth/role guard; replaces middleware)
│  ├─ app/
│  │  ├─ (marketing)/      # /, /pricing, /seminars, /about  (public, SEO)
│  │  ├─ (auth)/           # /login, /register, /verify, /forgot-password, /reset-password
│  │  ├─ (student)/        # /dashboard, /practice, /test/[taskId]
│  │  ├─ (coach)/          # /coach + /upload, /review, /students
│  │  ├─ (admin)/          # /admin + /users, /pricing, /analytics, /content
│  │  ├─ api/              # auth/* + attempts route handlers (Web Request/Response)
│  │  ├─ robots.ts · sitemap.ts · not-found.tsx
│  │  └─ layout.tsx        # root layout (fonts, metadata)
│  ├─ components/          # design system (ui/*), Logo, PageHero, marketing, student, test
│  ├─ lib/
│  │  ├─ auth/             # jwt, password, session, constants
│  │  ├─ parser/html.ts    # HTML → unified task parser
│  │  ├─ rbac.ts · env.ts · email.ts · otp.ts · grade.ts · format.ts · cn.ts · prisma.ts
│  │  └─ validators/       # zod request schemas
│  └─ types/task.ts        # NormalizedTask contract (zod)
├─ docker-compose.yml · Dockerfile · Makefile
└─ BUILD_CONTRACT.md · ARCHITECTURE.md · DEPLOY.md
```

---

## Roles & access (RBAC)

Five roles — `OWNER`, `ADMIN`, `COACH`, `DEVELOPER`, `STUDENT` — defined in `src/lib/rbac.ts`
and enforced at the edge (proxy) and in server components. Highlights: coaches author tasks
that need moderation; admins run the platform but pricing/billing stays with the owner;
developers get technical access without personal data. Full matrix in
[`ARCHITECTURE.md` §3](./ARCHITECTURE.md).

## Authentication

Registration verifies via a **6-digit code emailed** to the user (cheaper than SMS; phone is
stored, not SMS-verified). Codes are hashed, expire in 10 minutes, and allow 5 attempts.
Login issues short-lived access + long-lived refresh JWTs in `httpOnly` cookies, with refresh
rotation backed by a `Session` row. Email sending is a swappable stub until SMTP is wired.
Details in [`ARCHITECTURE.md` §4](./ARCHITECTURE.md).

---

## Documentation

- [`BUILD_CONTRACT.md`](./BUILD_CONTRACT.md) — build rules, Next 16 gotchas, design-system &
  lib APIs, route structure (read this before contributing code).
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system overview: stack, route zones, RBAC matrix,
  auth flow, data model, content pipeline, deploy, MVP vs phase 2.
- [`DEPLOY.md`](./DEPLOY.md) — local Docker, database/seed, Railway + Cloudflare deployment,
  environment variables.
