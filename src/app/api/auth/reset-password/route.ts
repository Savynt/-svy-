import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { verifyCode } from '@/lib/otp'
import { resetSchema } from '@/lib/validators/auth'
import { rateLimit, ipFromRequest } from '@/lib/rate-limit'

/**
 * POST /api/auth/reset-password
 * Verify the PASSWORD_RESET OTP, set the new password, and revoke every active
 * session so any stolen/refresh tokens are killed. The user logs in fresh after.
 */
export async function POST(request: Request): Promise<Response> {
  // IP-level throttle: 10 attempts per 5 minutes
  const ip = ipFromRequest(request)
  const ipRl = await rateLimit(`reset-password:ip:${ip}`, 10, 5 * 60_000)
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

  const parsed = resetSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { email, code, password } = parsed.data

  // Per-email throttle: 5 attempts per 10 minutes
  const emailRl = await rateLimit(`reset-password:email:${email}`, 5, 10 * 60_000)
  if (!emailRl.ok) {
    return Response.json(
      { ok: false, error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(emailRl.retryAfter) } },
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    })
    // Generic invalid-code response whether or not the account exists (no enumeration).
    if (!user) {
      return Response.json({ ok: false, error: 'Invalid or expired code' }, { status: 400 })
    }

    const result = await verifyCode(email, 'PASSWORD_RESET', code)
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

    const passwordHash = await hashPassword(password)

    // Set the new password and revoke all live sessions in one transaction.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          ...(!user.emailVerified ? { emailVerified: new Date() } : {}),
        },
      }),
      prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ])

    return Response.json({ ok: true, message: 'Password updated. You can now sign in.' })
  } catch {
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
