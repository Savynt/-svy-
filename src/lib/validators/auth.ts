import { z } from 'zod'

/**
 * Zod schemas for the auth flows. Shared by the API route handlers and the
 * auth form shells so client + server validate identically.
 *
 * Founder's spec (BUILD_CONTRACT §7):
 *  - Register: First name, Last name, Email (Gmail), Phone (+998…), Password.
 *  - Email & phone are UNIQUE (uniqueness enforced in the route, not here).
 *  - Verification is a 6-digit email OTP (EMAIL_VERIFY / PASSWORD_RESET).
 */

/** Uzbek phone numbers: +998 followed by 9 digits. Spaces/dashes are stripped. */
const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^\+998\d{9}$/, 'Enter a valid Uzbek number, e.g. +998901234567'),
  )

/** Email — lowercased + trimmed so lookups are case-insensitive. */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254, 'Email is too long')

/** Password policy: 8–72 chars (bcrypt truncates beyond 72 bytes). */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')

/** 6-digit OTP. We accept only digits; the UI sends a plain string. */
const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code')

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(60, 'Too long')

export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  // Don't enforce the policy on login — only the credentials matter.
  password: z.string().min(1, 'Enter your password'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const forgotSchema = z.object({
  email: emailSchema,
})
export type ForgotInput = z.infer<typeof forgotSchema>

export const verifySchema = z.object({
  email: emailSchema,
  code: codeSchema,
})
export type VerifyInput = z.infer<typeof verifySchema>

export const resetSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  password: passwordSchema,
})
export type ResetInput = z.infer<typeof resetSchema>
