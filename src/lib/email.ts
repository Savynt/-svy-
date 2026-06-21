import { Resend } from 'resend'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'SVY'
const FROM_ADDRESS = process.env.SMTP_FROM ?? `noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') ?? 'svy.uz'}`

interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

// Singleton Resend client — created once per process.
let _resend: Resend | null = null

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_resend) _resend = new Resend(key)
  return _resend
}

async function deliver(message: EmailMessage): Promise<void> {
  const resend = getResend()

  if (!resend) {
    // Dev/stub mode — no API key configured.
    console.info(
      `\n──────────── ${APP_NAME} EMAIL (no RESEND_API_KEY) ────────────\n` +
        `To:      ${message.to}\n` +
        `Subject: ${message.subject}\n` +
        `${message.text}\n` +
        '──────────────────────────────────────────\n',
    )
    return
  }

  const { error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_ADDRESS}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  await deliver({
    to: email,
    subject: `Your ${APP_NAME} verification code`,
    text:
      `Welcome to ${APP_NAME}!\n\n` +
      `Your email verification code is: ${code}\n\n` +
      'It expires in 10 minutes. If you did not create an account, ignore this email.',
    html:
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">` +
      `<h2 style="color:#1e3a5f">Welcome to ${APP_NAME}!</h2>` +
      `<p>Your email verification code is:</p>` +
      `<div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e3a5f;padding:16px 0">${code}</div>` +
      `<p style="color:#6b7280;font-size:14px">It expires in 10 minutes. If you did not create an account, ignore this email.</p>` +
      `</div>`,
  })
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  await deliver({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    text:
      `We received a request to reset your ${APP_NAME} password.\n\n` +
      `Your password reset code is: ${code}\n\n` +
      'It expires in 10 minutes. If you did not request this, ignore this email.',
    html:
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">` +
      `<h2 style="color:#1e3a5f">Reset your ${APP_NAME} password</h2>` +
      `<p>Your password reset code is:</p>` +
      `<div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e3a5f;padding:16px 0">${code}</div>` +
      `<p style="color:#6b7280;font-size:14px">It expires in 10 minutes. If you did not request this, ignore this email.</p>` +
      `</div>`,
  })
}
