import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } from '@/lib/auth/session'

/** Refresh-session lifetime — matches REFRESH_TOKEN_TTL (30d) used by the JWT. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * POST /api/auth/refresh
 * Verify the refresh cookie, ensure its Session is live (not revoked/expired),
 * then ROTATE: revoke the old session, mint a new one, and issue fresh tokens.
 * A reused/revoked refresh token is rejected and the cookies are cleared.
 */
export async function POST(request: Request): Promise<Response> {
  const jar = await cookies()
  const refreshToken = jar.get(REFRESH_COOKIE)?.value

  const fail = async (): Promise<Response> => {
    await clearAuthCookies()
    return Response.json({ ok: false, error: 'Session expired' }, { status: 401 })
  }

  if (!refreshToken) return fail()

  const claims = await verifyRefreshToken(refreshToken)
  if (!claims?.sid || !claims.sub) return fail()

  const session = await prisma.session.findUnique({
    where: { id: claims.sid },
    select: { id: true, userId: true, revokedAt: true, expiresAt: true },
  })

  // Reject if the session is missing, revoked, expired, or doesn't match the token's user.
  if (
    !session ||
    session.revokedAt ||
    session.userId !== claims.sub ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    return fail()
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  })
  if (!user) return fail()

  // Rotate: revoke the old session and open a new one atomically.
  const [, newSession] = await prisma.$transaction([
    prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    }),
    prisma.session.create({
      data: {
        userId: user.id,
        userAgent: request.headers.get('user-agent') ?? undefined,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
      select: { id: true },
    }),
  ])

  const [accessToken, newRefreshToken] = await Promise.all([
    signAccessToken(user.id, user.role),
    signRefreshToken(user.id, newSession.id),
  ])
  await setAuthCookies(accessToken, newRefreshToken)

  return Response.json({ ok: true })
}
