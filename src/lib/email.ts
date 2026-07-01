/**
 * Email delivery — providers in order:
 *   1. Brevo REST API (HTTPS 443) — works on Railway Free
 *   2. Resend SDK (HTTPS 443) — needs verified domain for arbitrary recipients
 *   3. Console stub — dev / no config
 */

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Savynt'
const FROM_EMAIL = process.env.BREVO_FROM ?? process.env.SMTP_FROM ?? 'savynt.english@gmail.com'

interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

// ── Brevo REST API ────────────────────────────────────────────────────────────
async function sendViaBrevo(message: EmailMessage): Promise<boolean> {
  const key = process.env.BREVO_API_KEY
  if (!key) return false

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: APP_NAME, email: FROM_EMAIL },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
      ...(message.html ? { htmlContent: message.html } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Brevo API ${res.status}: ${body}`)
  }
  return true
}

// ── Resend SDK ────────────────────────────────────────────────────────────────
async function sendViaResend(message: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false

  const { Resend } = await import('resend')
  const resend = new Resend(key)
  const from = process.env.RESEND_FROM ?? FROM_EMAIL

  const { error } = await resend.emails.send({
    from: `${APP_NAME} <${from}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
  })

  if (error) throw new Error(`Resend: ${error.message}`)
  return true
}

// ── Deliver ───────────────────────────────────────────────────────────────────
async function deliver(message: EmailMessage): Promise<void> {
  if (await sendViaBrevo(message)) return
  if (await sendViaResend(message)) return

  console.info(
    `\n──────────── ${APP_NAME} EMAIL (no provider configured) ────────────\n` +
      `To:      ${message.to}\n` +
      `Subject: ${message.subject}\n` +
      `${message.text}\n` +
      '──────────────────────────────────────────\n',
  )
}

// ── Public helpers ────────────────────────────────────────────────────────────
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
