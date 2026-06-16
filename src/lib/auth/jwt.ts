import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { env } from '@/lib/env'
import type { Role } from '@/lib/rbac'

/**
 * JWT helpers built on `jose` (works in Node and Edge/proxy runtimes).
 * Access tokens are short-lived (15m); refresh tokens long-lived (30d) and
 * stored in an httpOnly cookie with rotation (see session.ts).
 */

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET)
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET)

export interface AccessClaims extends JWTPayload {
  sub: string // userId
  role: Role
  type: 'access'
}

export interface RefreshClaims extends JWTPayload {
  sub: string // userId
  sid: string // session id (for rotation/revocation)
  type: 'refresh'
}

export async function signAccessToken(userId: string, role: Role): Promise<string> {
  return new SignJWT({ role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(accessSecret)
}

export async function signRefreshToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_TTL)
    .sign(refreshSecret)
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret)
    if (payload.type !== 'access') return null
    return payload as AccessClaims
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshClaims | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret)
    if (payload.type !== 'refresh') return null
    return payload as RefreshClaims
  } catch {
    return null
  }
}
