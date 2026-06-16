/**
 * Provider-agnostic email stub.
 *
 * SVY sends the "SMS-style" 6-digit code over EMAIL to avoid SMS gateway costs
 * (BUILD_CONTRACT §7). For now this is a stub: if SMTP_* env vars are present we
 * log that a real send *would* happen; otherwise we print the code to the server
 * console so local/dev flows work end-to-end.
 *
 * TODO(founder): wire a real SMTP transport here once the mailbox is ready.
 *   The founder will provide a working mailbox (e.g. a Gmail/Yandex/Zoho account
 *   or a transactional provider). Read these from the environment — NEVER hardcode
 *   credentials, and keep them out of the repo (add to .env / deployment secrets):
 *     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
 *   Suggested implementation: add `nodemailer` and create a transport from the
 *   vars below, then replace the `deliver()` stub. Until then this is a no-op
 *   that surfaces the code to the console.
 */

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'SVY'

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
  secure: boolean
}

/** Read SMTP settings from env, or null if not fully configured. */
function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  const port = Number(process.env.SMTP_PORT ?? '587')
  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    user,
    pass,
    from: process.env.SMTP_FROM ?? user,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
  }
}

interface EmailMessage {
  to: string
  subject: string
  text: string
}

/**
 * The single delivery seam. Swap this body for a real transport (nodemailer,
 * Resend, etc.) when SMTP is wired — every send goes through here.
 */
async function deliver(message: EmailMessage): Promise<void> {
  const smtp = readSmtpConfig()

  if (smtp) {
    // TODO(founder): replace this log with an actual SMTP send using `smtp`.
    // e.g. nodemailer.createTransport({ host, port, secure, auth:{ user, pass } })
    //        .sendMail({ from: smtp.from, to, subject, text })
    console.info(
      `[email] SMTP configured (${smtp.host}:${smtp.port}); would send "${message.subject}" to ${message.to}. ` +
        'Real transport not wired yet — see TODO in src/lib/email.ts.',
    )
    return
  }

  // No SMTP configured — dev/stub mode. Surface the message so flows are testable.
  console.info(
    `\n──────────── ${APP_NAME} EMAIL (stub) ────────────\n` +
      `To:      ${message.to}\n` +
      `Subject: ${message.subject}\n` +
      `${message.text}\n` +
      '──────────────────────────────────────────\n',
  )
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  await deliver({
    to: email,
    subject: `Your ${APP_NAME} verification code`,
    text:
      `Welcome to ${APP_NAME}!\n\n` +
      `Your email verification code is: ${code}\n\n` +
      'It expires in 10 minutes. If you did not create an account, ignore this email.',
  })
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  await deliver({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    text:
      `We received a request to reset your ${APP_NAME} password.\n\n` +
      `Your password reset code is: ${code}\n\n` +
      'It expires in 10 minutes. If you did not request this, you can safely ignore this email.',
  })
}
