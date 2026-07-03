import { z } from 'zod'

/**
 * Validated environment. Import `env` anywhere server-side.
 * Never import this into a Client Component.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().default('postgresql://svy:svy@localhost:5432/svy?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Auth — minimum 32 chars. Dev defaults are published in source — forbidden in production.
  JWT_ACCESS_SECRET: z.string().min(32).default('dev-access-secret-do-not-use-in-production-xx'),
  JWT_REFRESH_SECRET: z.string().min(32).default('dev-refresh-secret-do-not-use-in-production-xx'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),

  // Public
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('SVY'),
})

export const env = schema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
})

// Fail fast at runtime if the well-known dev secrets reach production.
// Skip during `next build` (NEXT_PHASE = phase-production-build) — secrets are not needed then.
if (env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  if (env.JWT_ACCESS_SECRET.startsWith('dev-')) {
    throw new Error('JWT_ACCESS_SECRET must be a strong random secret in production.')
  }
  if (env.JWT_REFRESH_SECRET.startsWith('dev-')) {
    throw new Error('JWT_REFRESH_SECRET must be a strong random secret in production.')
  }
}

export type Env = typeof env
