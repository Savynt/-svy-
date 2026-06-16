# SVY platform — Deployment guide

Primary path: **Vercel (free)** with a **Neon Postgres** database (§A below).
Railway + Docker + Cloudflare remain documented as an alternative (§1 onward).

> Stack: Next.js 16 (App Router) · PostgreSQL (Neon) · Prisma 6 · Node 22.
> Redis is **not required** — the rate limiter is in-memory.

---

## A. Deploy to Vercel (free) — recommended

Prereqs: this repo pushed to GitHub, a Vercel account.

### A.1 Import the project
1. Vercel → **Add New… → Project** → import the `svy` repo.
2. Framework preset is auto-detected as **Next.js**. Root directory = repo root.
   Build command and output are automatic. `postinstall` runs `prisma generate`.

### A.2 Create the database (Neon, free)
1. In the Vercel project → **Storage → Create Database → Neon (Postgres)** → Free.
2. Vercel injects `DATABASE_URL` (a **pooled** connection string) automatically.
   Keep it — that's the runtime URL.
3. Copy the **direct** (non-pooled) connection string from the Neon dashboard —
   you'll need it once to create the schema (DDL over pgbouncer can fail).

### A.3 Environment variables
Set these in **Settings → Environment Variables** (Production + Preview):

| Variable              | Value                                             |
| --------------------- | ------------------------------------------------- |
| `DATABASE_URL`        | (auto, from Neon — pooled)                         |
| `JWT_ACCESS_SECRET`   | a 32+ char random string (`openssl rand -base64 48`) |
| `JWT_REFRESH_SECRET`  | a *different* 32+ char random string              |
| `NEXT_PUBLIC_APP_URL` | your Vercel URL, e.g. `https://svy.vercel.app`    |
| `NEXT_PUBLIC_APP_NAME`| `SVY`                                             |

`REDIS_URL`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL` have safe defaults — skip
unless you want to override them.

### A.4 Create schema + seed (once)
From your machine, pointing at the **direct** Neon URL:

```bash
DATABASE_URL="<neon-DIRECT-url>" npx prisma db push      # create tables
DATABASE_URL="<neon-DIRECT-url>" npx prisma db seed      # plans + demo users
# bootstrap the real owner (pass your own creds — never commit them):
DATABASE_URL="<neon-DIRECT-url>" OWNER_EMAIL="you@example.com" \
  OWNER_PASSWORD="a-strong-password" OWNER_PHONE="+99890..." \
  OWNER_FIRST_NAME="Name" npx tsx scripts/make-owner.ts
```

### A.5 Deploy
Push to the default branch → Vercel builds and deploys. After the first deploy,
update `NEXT_PUBLIC_APP_URL` to the final domain and redeploy if it changed.

> Security (public repo): no secrets live in git. `.env*` is gitignored,
> `scripts/make-owner.ts` reads creds from env, and the dev JWT defaults in
> `src/lib/env.ts` are placeholders — production **must** set real `JWT_*`.

---

## 0. ⚠️ Orchestrator action items (do these once, before first build)

These touch shared files that the infra task is **not** allowed to edit, so they
must be applied by the orchestrator:

1. **`next.config.ts` — enable standalone output.** The `Dockerfile` copies
   `.next/standalone`, which only exists when this is set:

   ```ts
   import type { NextConfig } from 'next'

   const nextConfig: NextConfig = {
     reactCompiler: true,
     output: 'standalone', // ← required by the Docker image
   }

   export default nextConfig
   ```

2. **`package.json` — add scripts so `make db-seed` / `prisma db seed` work.**
   The seed is TypeScript and is run through Prisma's seed runner:

   ```jsonc
   {
     "scripts": {
       "db:push": "prisma db push",
       "db:migrate": "prisma migrate deploy",
       "db:seed": "prisma db seed",
       "postinstall": "prisma generate"
     },
     "prisma": {
       "seed": "node --experimental-strip-types prisma/seed.ts"
     }
   }
   ```

   - Node 22 runs TypeScript directly via `--experimental-strip-types`, so no
     extra dependency (`tsx`/`ts-node`) is needed.
   - The seed imports use the `@/` alias; if the bare loader cannot resolve it,
     either add `tsx` and use `"seed": "tsx prisma/seed.ts"`, or change the two
     imports in `prisma/seed.ts` to relative paths (`../src/lib/...`). Prefer
     `tsx` if it is already in the toolchain.

Everything below assumes both are in place.

---

## 1. Run locally with Docker Compose

Prerequisites: Docker Desktop (or Docker Engine + Compose v2).

```bash
# 1. Create your local env file from the template and fill in secrets.
cp .env.example .env

# 2. Build and start web + postgres + redis (web waits for healthy db/redis).
make up            # == docker compose up -d --build

# 3. Create the database schema, then seed demo data (idempotent).
make db-push       # dev: pushes prisma/schema.prisma straight to Postgres
make db-seed       # 3 plans, 3 demo users, 2 free seminars

# 4. Open the app.
#    http://localhost:3000
```

Useful shortcuts (see `Makefile`):

| Command          | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `make up`        | Build + start the stack in the background                |
| `make down`      | Stop containers (keeps the Postgres/Redis volumes)       |
| `make logs`      | Tail logs from all services                              |
| `make ps`        | List running containers                                  |
| `make sh`        | Shell into the `web` container                           |
| `make db-push`   | Push schema to the DB (dev)                              |
| `make db-migrate`| Apply committed migrations (prod-style)                  |
| `make db-seed`   | Seed/refresh demo data                                   |
| `make clean`     | Stop **and delete data volumes** (full reset)            |

Inside Compose, `web` reaches the database at `postgres:5432` and Redis at
`redis:6379` (these overrides are set in `docker-compose.yml`, so the
`localhost` values in `.env` are only used when you run Next on the host).

### Run a one-off production image without Compose

```bash
docker build -t svy-web .
docker run --rm -p 3000:3000 --env-file .env svy-web
```

(You still need a reachable Postgres + Redis; point `DATABASE_URL` /
`REDIS_URL` at them.)

---

## 2. Database: schema & seed

- **Dev / first boot:** `make db-push` syncs `prisma/schema.prisma` to the DB
  with no migration history. Fast, but destructive on incompatible changes.
- **Production:** generate a migration locally
  (`npx prisma migrate dev --name <change>`), commit it, and deploy with
  `make db-migrate` (`prisma migrate deploy`) so history and data are preserved.
- **Seed:** `make db-seed` runs `prisma/seed.ts`. It is **idempotent** — Plans
  and Users are upserted on their unique keys (`Plan.code`, `User.email`) and
  Seminars are matched by title — so re-running never duplicates rows.

### Demo accounts created by the seed

| Email           | Role    | Password   |
| --------------- | ------- | ---------- |
| `owner@svy.uz`  | OWNER   | `svy12345` |
| `coach@svy.uz`  | COACH   | `svy12345` |
| `student@svy.uz`| STUDENT | `svy12345` |

All three are created with `emailVerified` set, so you can log in immediately.
**Remove or rotate these before going live.**

Seeded plans: `monthly` 20,000 UZS · `quarterly` 50,000 UZS · `yearly`
180,000 UZS. Seeded seminars: a free Google Meet IELTS Writing workshop and a
free YouTube Live CEFR Speaking session.

---

## 3. Deploy to Railway

Railway hosts the app container plus managed Postgres and Redis.

1. **Provision services** in a Railway project:
   - **Postgres** plugin → exposes `DATABASE_URL`.
   - **Redis** plugin → exposes `REDIS_URL`.
   - **Web service** from this repo (Railway builds the `Dockerfile`
     automatically; no Nixpacks config needed).
2. **Reference the plugin variables** in the web service so it inherits the DB
   and cache URLs:
   - `DATABASE_URL = ${{Postgres.DATABASE_URL}}`
   - `REDIS_URL = ${{Redis.REDIS_URL}}`
3. **Set the remaining env vars** (see the table in §5).
4. **Run migrations + seed** once after the first deploy. From the Railway
   service shell (or `railway run` locally against the prod env):

   ```bash
   npx prisma migrate deploy
   npx prisma db seed     # optional in prod; mainly for demo/staging
   ```

5. Railway assigns the container port via `$PORT`. The image already honours
   `PORT`/`HOSTNAME` (Next standalone reads them), so no extra config is needed.

> Note: the `output: 'standalone'` config and the `Dockerfile` are what make the
> Railway image small and `node server.js`-startable. Do not switch Railway to
> Nixpacks unless you remove the Dockerfile.

---

## 4. Cloudflare (DNS / CDN / TLS)

1. Add the domain to Cloudflare; set Cloudflare as the registrar nameservers.
2. Create a **CNAME** record pointing your app host (e.g. `app.svy.uz` or root
   `svy.uz`) to the Railway-provided domain, **Proxied** (orange cloud) for
   CDN + TLS.
3. SSL/TLS mode: **Full (strict)** — Railway terminates TLS with a valid cert.
4. Recommended: enable **Always Use HTTPS**, **Brotli**, and **HTTP/3**.
5. Set `NEXT_PUBLIC_APP_URL` to the public Cloudflare URL (e.g.
   `https://app.svy.uz`) so absolute links, emails and `sitemap`/`robots` use
   the right origin.
6. If you later add image/audio assets on R2, you can also front the R2 bucket
   with a Cloudflare custom domain for public reads.

---

## 5. Environment variables

Set these in `.env` locally and in the Railway web service for production.
Generate secrets with `openssl rand -base64 32`.

### Core (required)

| Variable             | Example / source                                   | Notes |
| -------------------- | -------------------------------------------------- | ----- |
| `NODE_ENV`           | `production`                                       | `development` locally |
| `DATABASE_URL`       | `postgresql://svy:svy@postgres:5432/svy?schema=public` | Railway: `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL`          | `redis://redis:6379`                               | Railway: `${{Redis.REDIS_URL}}` |
| `JWT_ACCESS_SECRET`  | 32+ random chars                                   | signs 15m access tokens |
| `JWT_REFRESH_SECRET` | 32+ random chars (different from access)           | signs 30d refresh tokens |
| `ACCESS_TOKEN_TTL`   | `15m`                                              | access token lifetime |
| `REFRESH_TOKEN_TTL`  | `30d`                                              | refresh token lifetime |
| `NEXT_PUBLIC_APP_URL`| `https://app.svy.uz`                               | public origin (Cloudflare) |
| `NEXT_PUBLIC_APP_NAME`| `SVY`                                             | display name |

### Email / SMTP (verification + password-reset codes)

`src/lib/email.ts` currently logs codes to the console; wire these when the
founder's mailbox is ready. Leave blank to keep the console-log stub.

| Variable      | Example                  | Notes |
| ------------- | ------------------------ | ----- |
| `SMTP_HOST`   | `smtp.gmail.com`         | mail server host |
| `SMTP_PORT`   | `587`                    | `465` for SMTPS |
| `SMTP_USER`   | `no-reply@svy.uz`        | mailbox login |
| `SMTP_PASS`   | app password / API key   | never commit |
| `SMTP_FROM`   | `SVY <no-reply@svy.uz>`  | From header |

### Cloudflare R2 (audio / media storage — phase 2)

| Variable               | Example         | Notes |
| ---------------------- | --------------- | ----- |
| `R2_ACCOUNT_ID`        | Cloudflare acct id | from R2 dashboard |
| `R2_ACCESS_KEY_ID`     | …               | R2 API token |
| `R2_SECRET_ACCESS_KEY` | …               | keep secret |
| `R2_BUCKET`            | `svy-audio`     | listening audio bucket |

### Google OAuth (phase 2 — "Continue with Google")

| Variable               | Example          | Notes |
| ---------------------- | ---------------- | ----- |
| `GOOGLE_CLIENT_ID`     | `…apps.googleusercontent.com` | OAuth client |
| `GOOGLE_CLIENT_SECRET` | …                | keep secret |

### AI grading (writing / speaking — phase 2)

| Variable            | Example | Notes |
| ------------------- | ------- | ----- |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | Claude API key for essay/speaking feedback |

> Secrets (`JWT_*`, `SMTP_PASS`, `R2_*`, `GOOGLE_CLIENT_SECRET`,
> `ANTHROPIC_API_KEY`) belong in Railway variables / a secret manager — never in
> the repo. `.env` is gitignored and excluded from the Docker build context via
> `.dockerignore`.
