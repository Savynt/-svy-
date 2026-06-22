import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { verifyCode } from '@/lib/otp'
import { resetSchema } from '@/lib/validators/auth'

/**
 * POST /api/auth/reset-password
 * Verify the PASSWORD_RESET OTP, set the new password, and revoke every active
 * session so any stolen/refresh tokens are killed. The user logs in fresh after.
 *
 * Rate limiting: throttle by email/IP here — the per-code 5-attempt cap in
 * otp.ts is the inner guard against brute-forcing the code.
 */
export async function POST(request: Request): Promise<Response> {
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
  // If the user was never verified (rare edge case), treat a successful code
  // redemption as proof of inbox access and mark the email verified too.
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
}
