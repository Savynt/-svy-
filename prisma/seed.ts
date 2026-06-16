/**
 * SVY platform — database seed.
 *
 * Idempotent: safe to run repeatedly. Plans and users are upserted on their
 * unique keys (Plan.code, User.email); seminars have no natural unique key, so
 * they are matched by title before insert.
 *
 * Run via:
 *   npm run db:seed            (after the orchestrator adds the script — see DEPLOY.md)
 *   prisma db seed             (after adding the "prisma.seed" config — see DEPLOY.md)
 *   make db-seed               (inside docker compose)
 */
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { Role, SeminarPlatform } from '@prisma/client'

// Known dev password for the demo accounts. Documented in DEPLOY.md.
// NOT for production — these accounts should be removed/rotated before go-live.
const DEMO_PASSWORD = 'svy12345'

interface PlanSeed {
  code: string
  name: string
  priceUzs: number
  periodDays: number
  perks: string[]
  highlight: boolean
  sortOrder: number
}

const PLANS: PlanSeed[] = [
  {
    code: 'monthly',
    name: 'Monthly',
    priceUzs: 20_000,
    periodDays: 30,
    highlight: true,
    sortOrder: 0,
    perks: [
      'Full access to all CEFR & IELTS practice',
      'Listening, Reading, Speaking & Writing',
      'Vocabulary trainer (Beginner → Advanced)',
      'Grammar lessons & explanations',
      'Progress tracking & band estimates',
      'Cancel anytime',
    ],
  },
  {
    code: 'quarterly',
    name: '3 Months',
    priceUzs: 50_000,
    periodDays: 90,
    highlight: false,
    sortOrder: 1,
    perks: [
      'Everything in Monthly',
      'Save ~17% vs monthly',
      'Priority access to new mock tests',
      'Downloadable answer keys',
    ],
  },
  {
    code: 'yearly',
    name: 'Yearly',
    priceUzs: 180_000,
    periodDays: 365,
    highlight: false,
    sortOrder: 2,
    perks: [
      'Everything in Monthly',
      'Save 25% — best value',
      '2 mock-exam reviews by a tutor',
      'Certificate of completion',
    ],
  },
]

interface UserSeed {
  email: string
  firstName: string
  lastName: string
  role: Role
  phone: string
}

const DEMO_USERS: UserSeed[] = [
  {
    email: 'owner@svy.uz',
    firstName: 'Sardor',
    lastName: 'Owner',
    role: Role.OWNER,
    phone: '+998900000001',
  },
  {
    email: 'coach@svy.uz',
    firstName: 'Dilnoza',
    lastName: 'Coach',
    role: Role.COACH,
    phone: '+998900000002',
  },
  {
    email: 'student@svy.uz',
    firstName: 'Aziz',
    lastName: 'Student',
    role: Role.STUDENT,
    phone: '+998900000003',
  },
]

interface SeminarSeed {
  title: string
  description: string
  platform: SeminarPlatform
  joinUrl: string
  scheduledAt: Date
  durationMin: number
}

// Schedule two upcoming free seminars relative to "now" so the dates always
// look fresh after a reseed.
const now = new Date()
const inDays = (days: number, hour: number): Date => {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d
}

const SEMINARS: SeminarSeed[] = [
  {
    title: 'IELTS Writing Task 2: Band 7 Essay Structure',
    description:
      'A free live workshop on planning, structuring and timing IELTS Writing Task 2. ' +
      'We break down a Band 7+ essay paragraph by paragraph and answer your questions live.',
    platform: SeminarPlatform.GOOGLE_MEET,
    joinUrl: 'https://meet.google.com/svy-ielts-writing',
    scheduledAt: inDays(7, 18),
    durationMin: 60,
  },
  {
    title: 'CEFR Speaking: How to Sound Natural at B2–C1',
    description:
      'A free YouTube Live session on fluency, linking words and pronunciation for the CEFR ' +
      'Multilevel speaking exam. Includes model answers and common mistakes to avoid.',
    platform: SeminarPlatform.YOUTUBE_LIVE,
    joinUrl: 'https://youtube.com/live/svy-cefr-speaking',
    scheduledAt: inDays(14, 19),
    durationMin: 75,
  },
]

async function seedPlans(): Promise<void> {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        priceUzs: plan.priceUzs,
        periodDays: plan.periodDays,
        perks: plan.perks,
        highlight: plan.highlight,
        sortOrder: plan.sortOrder,
        isActive: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        priceUzs: plan.priceUzs,
        periodDays: plan.periodDays,
        perks: plan.perks,
        highlight: plan.highlight,
        sortOrder: plan.sortOrder,
        isActive: true,
      },
    })
    console.log(`  ✓ plan: ${plan.code} (${plan.priceUzs.toLocaleString('en-US')} UZS)`)
  }
}

async function seedUsers(): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const verifiedAt = new Date()

  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        passwordHash,
        emailVerified: verifiedAt,
        locale: 'en',
      },
      create: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        passwordHash,
        emailVerified: verifiedAt,
        locale: 'en',
      },
    })
    console.log(`  ✓ user: ${user.email} (${user.role})`)
  }
}

async function seedSeminars(): Promise<void> {
  for (const seminar of SEMINARS) {
    // Seminar has no unique constraint other than id; match on title to stay idempotent.
    const existing = await prisma.seminar.findFirst({ where: { title: seminar.title } })
    if (existing) {
      await prisma.seminar.update({
        where: { id: existing.id },
        data: {
          description: seminar.description,
          platform: seminar.platform,
          joinUrl: seminar.joinUrl,
          scheduledAt: seminar.scheduledAt,
          durationMin: seminar.durationMin,
          isFree: true,
        },
      })
      console.log(`  ✓ seminar (updated): ${seminar.title}`)
    } else {
      await prisma.seminar.create({
        data: {
          title: seminar.title,
          description: seminar.description,
          platform: seminar.platform,
          joinUrl: seminar.joinUrl,
          scheduledAt: seminar.scheduledAt,
          durationMin: seminar.durationMin,
          isFree: true,
        },
      })
      console.log(`  ✓ seminar (created): ${seminar.title}`)
    }
  }
}

async function main(): Promise<void> {
  console.log('Seeding SVY database…')
  console.log('Plans:')
  await seedPlans()
  console.log('Users:')
  await seedUsers()
  console.log('Seminars:')
  await seedSeminars()
  console.log('Done. Demo login password for *@svy.uz accounts: ' + DEMO_PASSWORD)
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
