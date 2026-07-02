import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from './jwt'
import { ACCESS_COOKIE, REFRESH_COOKIE } from './constants'
import type { Role } from '@/lib/rbac'

/**
 * Server-only session helpers. In Next.js 16 `cookies()` is ASYNC — always await it.
 * Do not import this into Client Components.
 */

export { ACCESS_COOKIE, REFRESH_COOKIE }

const isProd = process.env.NODE_ENV === 'production'

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const jar = await cookies()
  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 120, // 2 hours
  })
  jar.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function clearAuthCookies() {
  const jar = await cookies()
  jar.delete(ACCESS_COOKIE)
  jar.delete(REFRESH_COOKIE)
}

export interface SessionUser {
  id: string
  role: Role
}

/** Returns the verified claims from the access cookie, or null. */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(ACCESS_COOKIE)?.value
  if (!token) return null
  const claims = await verifyAccessToken(token)
  if (!claims) return null
  return { id: claims.sub, role: claims.role }
}

/** Full user record from DB (or null). */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  return prisma.user.findUnique({ where: { id: session.id } })
}

/** Use in server components / actions to require auth. Redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

/** Require one of the given roles, else redirect. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await requireUser()
  if (!roles.includes(session.role)) redirect('/dashboard')
  return session
}
