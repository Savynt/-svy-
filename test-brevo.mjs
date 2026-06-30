import nodemailer from 'nodemailer'

const t = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  family: 4,
})

try {
  await t.verify()
  console.log('✅ SMTP connection verified')
  const info = await t.sendMail({
    from: `"SVY" <${process.env.SMTP_FROM}>`,
    to: 'polatbekismoilov17@gmail.com',
    subject: 'SVY — тест Brevo SMTP',
    text: 'Это тестовое письмо. Если ты это видишь — Brevo работает!',
    html: '<div style="font-family:sans-serif"><h2>SVY ✅</h2><p>Brevo SMTP работает. Письма доставляются.</p></div>',
  })
  console.log('✅ Email sent:', info.messageId)
} catch (e) {
  console.error('❌ ERR:', e.message)
  process.exit(1)
}
