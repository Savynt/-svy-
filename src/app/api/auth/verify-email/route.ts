import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/session'
import { homeForRole } from '@/lib/rbac'
import { verifyCode } from '@/lib/otp'
import { verifySchema } from '@/lib/validators/auth'

/** Refresh-session lifetime — matches REFRESH_TOKEN_TTL (30d) used by the JWT. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * POST /api/auth/verify-email
 * Confirm the EMAIL_VERIFY OTP → mark the user verified → open a Session (for
 * refresh rotation) and set auth cookies, logging the user straight in.
 *
 * Rate limiting: throttle by email/IP here — OTP entry is a brute-force surface
 * (the per-code 5-attempt cap in otp.ts is the inner guard).
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { email, code } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, emailVerified: true },
  })
  // Don't reveal whether the account exists — generic invalid-code response.
  if (!user) {
    return Response.json({ ok: false, error: 'Invalid or expired code' }, { status: 400 })
  }

  if (user.emailVerified) {
    return Response.json({ ok: true, alreadyVerified: true, redirectTo: homeForRole(user.role) })
  }

  const result = await verifyCode(email, 'EMAIL_VERIFY', code)
  if (!result.ok) {
    const status = result.reason === 'too_many_attempts' ? 429 : 400
    const error =
      result.reason === 'too_many_attempts'
        ? 'Too many attempts. Request a new code.'
        : result.reason === 'expired'
          ? 'This code has expired. Request a new one.'
          : 'Invalid or expired code'
    return Response.json({ ok: false, error }, { status })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  })

  // Open a refresh session and log the user in.
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      userAgent: request.headers.get('user-agent') ?? undefined,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
    select: { id: true },
  })

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id, user.role),
    signRefreshToken(user.id, session.id),
  ])
  await setAuthCookies(accessToken, refreshToken)

  return Response.json({ ok: true, redirectTo: homeForRole(user.role) })
}
