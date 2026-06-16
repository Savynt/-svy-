import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken } from '@/lib/auth/jwt'
import { clearAuthCookies, REFRESH_COOKIE } from '@/lib/auth/session'

/**
 * POST /api/auth/logout
 * Revoke the current refresh Session (so the token can't be rotated) and clear
 * both auth cookies. Always returns 200 — logging out is idempotent.
 */
export async function POST(): Promise<Response> {
  const jar = await cookies()
  const refreshToken = jar.get(REFRESH_COOKIE)?.value

  if (refreshToken) {
    const claims = await verifyRefreshToken(refreshToken)
    if (claims?.sid) {
      // Mark the session revoked if it isn't already. Tolerate a missing row.
      await prisma.session.updateMany({
        where: { id: claims.sid, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
  }

  await clearAuthCookies()
  return Response.json({ ok: true })
}
