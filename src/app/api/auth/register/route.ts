import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { issueCode } from '@/lib/otp'
import { sendVerificationEmail } from '@/lib/email'
import { registerSchema } from '@/lib/validators/auth'

/**
 * POST /api/auth/register
 * Validate → ensure email & phone are unique → hash password → create the user
 * (unverified) → issue + email a 6-digit OTP. No session is created here; the
 * client moves on to /verify and we issue tokens once the email is confirmed.
 *
 * Rate limiting: add an IP/email throttle here (e.g. Redis token bucket) before
 * the DB writes — registration is a spam/enumeration surface.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { firstName, lastName, email, phone, password } = parsed.data

  // Friendly pre-check for duplicates (the unique index is the real guard below).
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { email: true, phone: true },
  })
  if (existing) {
    const field = existing.email === email ? 'email' : 'phone'
    return Response.json(
      {
        ok: false,
        error: field === 'email' ? 'This email is already registered' : 'This phone number is already registered',
        field,
      },
      { status: 409 },
    )
  }

  const passwordHash = await hashPassword(password)

  try {
    await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
        role: 'STUDENT',
        // emailVerified stays null until the OTP is confirmed.
      },
      select: { id: true },
    })
  } catch (error) {
    // Race condition: someone took the email/phone between the check and insert.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target
      const field = Array.isArray(target) && target.includes('phone') ? 'phone' : 'email'
      return Response.json(
        {
          ok: false,
          error: field === 'phone' ? 'This phone number is already registered' : 'This email is already registered',
          field,
        },
        { status: 409 },
      )
    }
    throw error
  }

  // Issue + email the verification code. Failure to send shouldn't 500 the
  // signup — the user can request a resend — but we log it.
  try {
    const code = await issueCode(email, 'EMAIL_VERIFY')
    await sendVerificationEmail(email, code)
  } catch (error) {
    console.error('[register] failed to send verification email', error)
  }

  return Response.json(
    { ok: true, message: 'Account created. Check your email for a 6-digit verification code.', email },
    { status: 201 },
  )
}
