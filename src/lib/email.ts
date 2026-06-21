import nodemailer from 'nodemailer'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'SVY'

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
  secure: boolean
}

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
    // port 465 = implicit TLS (secure: true); 587 = STARTTLS (secure: false)
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
  }
}

interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

async function deliver(message: EmailMessage): Promise<void> {
  const smtp = readSmtpConfig()

  if (!smtp) {
    // Dev/stub mode — print to console so local flows are testable.
    console.info(
      `\n──────────── ${APP_NAME} EMAIL (no SMTP configured) ────────────\n` +
        `To:      ${message.to}\n` +
        `Subject: ${message.subject}\n` +
        `${message.text}\n` +
        '──────────────────────────────────────────\n',
    )
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    // Railway blocks IPv6 outbound — force IPv4 to reach smtp.gmail.com
    family: 4,
  } as any)

  await transport.sendMail({
    from: `"${APP_NAME}" <${smtp.from}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
  })
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
