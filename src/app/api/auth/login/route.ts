import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/session'
import { homeForRole } from '@/lib/rbac'
import { loginSchema } from '@/lib/validators/auth'

/** Refresh-session lifetime — matches REFRESH_TOKEN_TTL (30d) used by the JWT. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * A real bcrypt hash compared against on the "no such user" path so login timing
 * is roughly constant whether or not the email exists (anti-enumeration). It's a
 * hash of a throwaway string — it can never match a real password.
 */
const DUMMY_HASH = '$2b$12$VvI01ukjQ0fpYk8wK6y6VO.exriKNGPWXpNTC5sHKx7mc6aqRlln6'

/**
 * POST /api/auth/login
 * email + password → verify password → require a verified email → open a
 * Session (refresh rotation) + set auth cookies → return homeForRole.
 *
 * Rate limiting: add an email/IP throttle here (failed-login counter) before the
 * password compare to blunt credential stuffing.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, passwordHash: true, emailVerified: true },
  })

  // Generic message whether the email is unknown or the password is wrong — no
  // account enumeration. Run a bcrypt compare even on the miss path so response
  // timing doesn't reveal whether the account exists.
  let valid = false
  if (user?.passwordHash) {
    valid = await verifyPassword(password, user.passwordHash)
  } else {
    await verifyPassword(password, DUMMY_HASH)
  }

  if (!user || !valid) {
    return Response.json({ ok: false, error: 'Invalid email or password' }, { status: 401 })
  }

  if (!user.emailVerified) {
    return Response.json(
      { ok: false, error: 'Please verify your email first', needsVerification: true, email },
      { status: 403 },
    )
  }

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
