import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/session'
import { homeForRole } from '@/lib/rbac'
import { verifyCode } from '@/lib/otp'
import { verifySchema } from '@/lib/validators/auth'
import { rateLimit, ipFromRequest } from '@/lib/rate-limit'
import { SESSION_TTL_MS } from '@/lib/auth/constants'

/**
 * POST /api/auth/verify-email
 * Confirm the EMAIL_VERIFY OTP → mark the user verified → open a Session (for
 * refresh rotation) and set auth cookies, logging the user straight in.
 */
export async function POST(request: Request): Promise<Response> {
  // IP-level throttle: 15 attempts per 5 minutes
  const ip = ipFromRequest(request)
  const ipRl = await rateLimit(`verify-email:ip:${ip}`, 15, 5 * 60_000)
  if (!ipRl.ok) {
    return Response.json(
      { ok: false, error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(ipRl.retryAfter) } },
    )
  }

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

  // Per-email throttle: 10 attempts per 10 minutes
  const emailRl = await rateLimit(`verify-email:email:${email}`, 10, 10 * 60_000)
  if (!emailRl.ok) {
    return Response.json(
      { ok: false, error: 'Too many attempts. Request a new code.' },
      { status: 429, headers: { 'Retry-After': String(emailRl.retryAfter) } },
    )
  }

  try {
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
  } catch {
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
