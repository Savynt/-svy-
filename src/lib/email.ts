/**
 * Email delivery — tries providers in order:
 *   1. Resend (HTTP, port 443) — needs RESEND_API_KEY + verified domain
 *   2. Nodemailer SMTP — use Brevo port 2525 (not blocked by Railway free)
 *   3. Console stub — dev / no config
 */
import nodemailer from 'nodemailer'
import { Resend } from 'resend'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'SVY'

interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

// ── Resend (primary when RESEND_API_KEY is set + domain verified) ──────────
let _resend: Resend | null = null
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_resend) _resend = new Resend(key)
  return _resend
}

const resendFrom =
  process.env.RESEND_FROM ??
  process.env.SMTP_FROM ??
  'noreply@svy.uz'

// ── Nodemailer SMTP (fallback — Brevo port 2525, Gmail, etc.) ─────────────
interface SmtpConfig { host: string; port: number; user: string; pass: string; from: string; secure: boolean }

function readSmtp(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  const port = Number(process.env.SMTP_PORT ?? '587')
  return {
    host, user, pass,
    port: Number.isFinite(port) ? port : 587,
    from: process.env.SMTP_FROM ?? user,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _transport: nodemailer.Transporter<any> | null = null
let _smtpFrom = ''

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTransport(): nodemailer.Transporter<any> | null {
  if (_transport) return _transport
  const smtp = readSmtp()
  if (!smtp) return null
  _smtpFrom = smtp.from
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    // Port 2525 (Brevo) works on Railway free plan; 587/465 are blocked.
    // family:4 keeps IPv4 for standard ports.
    family: 4,
  } as any)
  return _transport
}

// ── Deliver ───────────────────────────────────────────────────────────────
async function deliver(message: EmailMessage): Promise<void> {
  // 1. Resend
  const resend = getResend()
  if (resend) {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${resendFrom}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    })
    if (error) throw new Error(`Resend: ${error.message}`)
    return
  }

  // 2. SMTP (nodemailer)
  const transport = getTransport()
  if (transport) {
    await transport.sendMail({
      from: `"${APP_NAME}" <${_smtpFrom}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    })
    return
  }

  // 3. Stub
  console.info(
    `\n──────────── ${APP_NAME} EMAIL (no provider configured) ────────────\n` +
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
