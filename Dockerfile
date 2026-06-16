# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# SVY platform — multi-stage production image for Next.js 16 (standalone output)
#
# Requires `output: 'standalone'` in next.config.ts (see DEPLOY.md — the
# orchestrator must add it). Without it, `.next/standalone` is not produced and
# the `runner` stage will fail to find `server.js`.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install all dependencies (incl. dev) ───────────────────────────
FROM node:22-alpine AS deps
# libc6-compat keeps some native deps (e.g. Prisma engines) happy on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy only manifests first so this layer is cached unless deps change.
COPY package.json package-lock.json* ./
# Prisma's postinstall runs `prisma generate`, which needs the schema present.
COPY prisma ./prisma
RUN npm ci

# ── Stage 2: build the Next.js app ──────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure a public/ dir exists so the runner COPY below never fails, even if the
# repo ships no static assets yet.
RUN mkdir -p public

# Generate the Prisma client against the schema (idempotent; safe if already run).
RUN npx prisma generate

# Telemetry off and a production build. `output: 'standalone'` makes Next emit
# a self-contained server at .next/standalone.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ── Stage 3: minimal runtime image ──────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Public assets and the standalone server + traced node_modules.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ship the Prisma schema + generated client so `prisma migrate deploy` / `prisma
# db seed` can run inside the container (see Makefile / DEPLOY.md).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

# server.js is emitted by Next's standalone output.
CMD ["node", "server.js"]
