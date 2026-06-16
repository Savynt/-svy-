/**
 * One-off: create/promote the platform OWNER account (verified).
 *
 * Credentials come from env so NO personal data lives in this (public) repo.
 * Run with your own values:
 *   OWNER_EMAIL=you@example.com OWNER_PASSWORD='strong-pass' \
 *   OWNER_PHONE='+99890...' OWNER_FIRST_NAME='Name' npx tsx scripts/make-owner.ts
 *
 * Falls back to a generic demo owner when env vars are absent.
 */
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'

async function main() {
  const email = process.env.OWNER_EMAIL ?? 'owner@svy.uz'
  const password = process.env.OWNER_PASSWORD ?? 'change-me-now'
  const phone = process.env.OWNER_PHONE ?? null
  const firstName = process.env.OWNER_FIRST_NAME ?? 'Owner'
  const passwordHash = await hashPassword(password)

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'OWNER', phone, firstName, emailVerified: new Date(), passwordHash },
    create: { email, phone, firstName, role: 'OWNER', emailVerified: new Date(), passwordHash },
  })

  console.log(`OWNER ready → ${user.email} (role=${user.role})`)
  if (!process.env.OWNER_PASSWORD) {
    console.warn('⚠  No OWNER_PASSWORD set — used a placeholder. Change it immediately.')
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
