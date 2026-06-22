import { prisma } from '@/lib/prisma'
import { issueCode } from '@/lib/otp'
import { sendPasswordResetEmail } from '@/lib/email'
import { forgotSchema } from '@/lib/validators/auth'
import { rateLimit, ipFromRequest } from '@/lib/rate-limit'

/**
 * POST /api/auth/forgot-password
 * If the email belongs to a user, issue + email a PASSWORD_RESET OTP. We ALWAYS
 * respond 200 with the same generic message so the endpoint can't be used to
 * enumerate which emails are registered.
 *
 * Rate limiting: throttle by email/IP here — without a cap this can be abused to
 * spam a victim's inbox or probe for accounts via timing.
 */
export async function POST(request: Request): Promise<Response> {
  const ip = ipFromRequest(request)
  const rl = await rateLimit(`forgot:${ip}`, 5, 60_000)
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = forgotSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { email } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  // Only actually send when the account exists — but never leak that fact.
  if (user) {
    try {
      const code = await issueCode(email, 'PASSWORD_RESET')
      await sendPasswordResetEmail(email, code)
    } catch (error) {
      console.error('[forgot-password] failed to send reset email', error)
    }
  }

  return Response.json({
    ok: true,
    message: 'If an account exists for that email, a reset code has been sent.',
  })
}
