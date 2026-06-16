import { randomInt } from 'node:crypto'
import type { VerificationPurpose } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

/**
 * Email OTP helpers (BUILD_CONTRACT §7).
 *
 *  - 6-digit numeric codes, generated with a CSPRNG.
 *  - Only the bcrypt HASH of the code is stored (never plaintext).
 *  - Codes expire after 10 minutes and allow at most 5 verification attempts.
 *  - Issuing a new code invalidates any earlier unconsumed code for the same
 *    (email, purpose) pair, so only the latest code is ever valid.
 */

export const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const OTP_MAX_ATTEMPTS = 5
const OTP_LENGTH = 6

/** Cryptographically-strong 6-digit code as a zero-padded string. */
export function generateCode(): string {
  // randomInt is unbiased over [0, 1_000_000).
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0')
}

/**
 * Issue a fresh OTP for (email, purpose): invalidate prior unconsumed codes,
 * store the hash, and return the PLAINTEXT code (caller emails it; never persist).
 */
export async function issueCode(
  email: string,
  purpose: VerificationPurpose,
): Promise<string> {
  const code = generateCode()
  const codeHash = await hashPassword(code)
  const now = new Date()

  // Consume any still-live codes so the previous one stops working.
  await prisma.verificationCode.updateMany({
    where: { email, purpose, consumedAt: null },
    data: { consumedAt: now },
  })

  await prisma.verificationCode.create({
    data: {
      email,
      codeHash,
      purpose,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    },
  })

  return code
}

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'too_many_attempts' | 'invalid' }

/**
 * Validate a submitted code against the latest unconsumed VerificationCode for
 * (email, purpose). On success the row is marked consumed (single use). On a
 * wrong code the attempt counter is incremented; after OTP_MAX_ATTEMPTS the row
 * is consumed and further tries are rejected until a new code is issued.
 */
export async function verifyCode(
  email: string,
  purpose: VerificationPurpose,
  code: string,
): Promise<VerifyCodeResult> {
  const record = await prisma.verificationCode.findFirst({
    where: { email, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) return { ok: false, reason: 'not_found' }

  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    })
    return { ok: false, reason: 'expired' }
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    })
    return { ok: false, reason: 'too_many_attempts' }
  }

  const matches = await verifyPassword(code, record.codeHash)
  if (!matches) {
    const attempts = record.attempts + 1
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: {
        attempts,
        // Burn the code once the cap is hit so brute-forcing stops immediately.
        consumedAt: attempts >= OTP_MAX_ATTEMPTS ? new Date() : null,
      },
    })
    return {
      ok: false,
      reason: attempts >= OTP_MAX_ATTEMPTS ? 'too_many_attempts' : 'invalid',
    }
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  })
  return { ok: true }
}
