// Static marketing data for the public site.
// The DB (Plan / Seminar) is empty in this build, so the marketing pages render
// from these constants. Prices mirror the founder's spec: 20 000 UZS / month.
// formatUzs lives in '@/lib/format' — never re-implement currency formatting here.

import type { SeminarPlatform } from '@prisma/client'

/** A subscription plan as shown on the public pricing page. */
export interface MarketingPlan {
  /** Stable code, mirrors Plan.code in the schema ("monthly" | "quarterly" | "yearly"). */
  code: 'monthly' | 'quarterly' | 'yearly'
  name: string
  /** Current price in UZS (format with formatUzs at render time). */
  priceUzs: number
  /** Human-readable billing period, e.g. "/ month". */
  period: string
  /** Billing period length in days (30 / 90 / 365). */
  periodDays: number
  /** Short note under the price, e.g. a savings line. null = nothing. */
  note: string | null
  /** What the plan unlocks. */
  perks: string[]
  /** Highlights this plan as the recommended / most-popular option. */
  highlight: boolean
}

/**
 * The three public plans. Monthly is highlighted as the recommended option
 * (the headline 20 000 UZS / month price). Longer periods cost less per month
 * and add a few extras, but core preparation is identical on every plan.
 */
export const PLANS: MarketingPlan[] = [
  {
    code: 'monthly',
    name: 'Monthly',
    priceUzs: 20000,
    period: '/ month',
    periodDays: 30,
    note: 'Best to start — cancel anytime',
    highlight: true,
    perks: [
      'Full access to all IELTS, SAT & General English practice',
      'Listening, Reading, Speaking & Writing',
      'Vocabulary trainer (A1 → C2)',
      'Grammar lessons & explanations',
      'Progress tracking & band estimates',
      'Cancel anytime — no lock-in',
    ],
  },
  {
    code: 'quarterly',
    name: '3 Months',
    priceUzs: 50000,
    period: '/ 3 months',
    periodDays: 90,
    note: 'Save ~17% vs monthly',
    highlight: false,
    perks: [
      'Everything in Monthly',
      'Works out to ~16,700 UZS / month',
      'Priority access to new mock tests',
      'Downloadable answer keys',
    ],
  },
  {
    code: 'yearly',
    name: 'Yearly',
    priceUzs: 180000,
    period: '/ year',
    periodDays: 365,
    note: 'Save 25% — best value',
    highlight: false,
    perks: [
      'Everything in 3 Months',
      'Works out to 15,000 UZS / month',
      '2 mock-exam reviews by a tutor',
      'Certificate of completion',
    ],
  },
]

/** Local payment rails available in Uzbekistan. */
export const PAYMENT_METHODS = ['Click', 'Payme', 'Uzcard', 'Humo'] as const

/** A single feature row of the pricing comparison table. */
export interface FeatureRow {
  label: string
  monthly: boolean
  quarterly: boolean
  yearly: boolean
}

/** Plan comparison — core prep is identical; higher tiers add power-user extras. */
export const FEATURE_ROWS: FeatureRow[] = [
  { label: 'General English practice (all 4 skills)', monthly: true, quarterly: true, yearly: true },
  { label: 'IELTS & SAT full mock tests', monthly: true, quarterly: true, yearly: true },
  { label: 'Vocabulary trainer — A1 to C2', monthly: true, quarterly: true, yearly: true },
  { label: 'Grammar lessons & explanations', monthly: true, quarterly: true, yearly: true },
  { label: 'Progress tracking & band estimates', monthly: true, quarterly: true, yearly: true },
  { label: 'Downloadable answer keys', monthly: false, quarterly: true, yearly: true },
  { label: 'Priority access to new mocks', monthly: false, quarterly: true, yearly: true },
  { label: 'Tutor review of your mock exams', monthly: false, quarterly: false, yearly: true },
]

/** A frequently-asked question shown in the pricing accordion. */
export interface FaqItem {
  q: string
  a: string
}

export const FAQS: FaqItem[] = [
  {
    q: 'Which payment methods can I use in Uzbekistan?',
    a: 'You can pay in UZS with Click, Payme, or any Uzcard / Humo bank card. Everything is processed locally — no foreign card or currency conversion needed.',
  },
  {
    q: 'Can I cancel my subscription?',
    a: 'Yes, anytime. Cancel from your dashboard and you keep full access until the end of the period you already paid for. There are no cancellation fees.',
  },
  {
    q: 'Do you add new tests and mocks?',
    a: 'Regularly. We add fresh General English sets and IELTS & SAT full mock tests every month. The 3-month and yearly plans get priority access to new material as soon as it ships.',
  },
  {
    q: 'Is Savynt for school or for work?',
    a: 'Both. Whether you need General English skills for university or an IELTS / SAT score for study and work abroad, one subscription covers every track, level and skill.',
  },
  {
    q: 'Are the live seminars really free?',
    a: 'Yes. Our seminars run on Google Meet and YouTube Live and are free for everyone — you do not need a subscription to join. Recordings are posted afterwards.',
  },
  {
    q: 'What about refunds?',
    a: 'If something goes wrong with a payment, contact us within 7 days and we will sort it out. Because you can cancel anytime and only pay for one period at a time, there is no risk of being over-charged.',
  },
]

/** A free live seminar as shown on the public seminars page. */
export interface MarketingSeminar {
  id: string
  title: string
  description: string
  platform: SeminarPlatform
  /** ISO date-time string for the live session. */
  scheduledAt: string
  durationMin: number
  /** Coach / host name. */
  host: string
  /** Recording available for past sessions. */
  hasRecording: boolean
  /** Topic tags. */
  tags: string[]
}

/**
 * Sample free seminars. In production these come from the Seminar table; the DB
 * is empty in this build, so the page renders this curated sample. Dates are kept
 * relative to a fixed reference so the listing always shows upcoming + past items.
 */
export const SEMINARS: MarketingSeminar[] = [
  {
    id: 'ielts-writing-task2-band7',
    title: 'IELTS Writing Task 2: how to reach Band 7',
    description:
      'A live walkthrough of the four marking criteria with real essays, common mistakes, and a repeatable paragraph structure you can use on exam day.',
    platform: 'GOOGLE_MEET',
    scheduledAt: '2026-06-14T15:00:00.000Z',
    durationMin: 75,
    host: 'Madina Yusupova',
    hasRecording: false,
    tags: ['IELTS', 'Writing'],
  },
  {
    id: 'general-english-speaking-confidence',
    title: 'General English Speaking: sound fluent and natural',
    description:
      'Practical phrases, fillers and pacing that build real confidence. We do live mini-mocks and work on pronunciation, flow and vocabulary range.',
    platform: 'YOUTUBE_LIVE',
    scheduledAt: '2026-06-21T13:00:00.000Z',
    durationMin: 60,
    host: 'Jasur Karimov',
    hasRecording: false,
    tags: ['General English', 'Speaking'],
  },
  {
    id: 'sat-reading-strategy',
    title: 'SAT Reading: tackle every question type fast',
    description:
      'Evidence-based reading tips, vocabulary in context, and how to manage the clock. Practice passages with full walkthrough and Q&A.',
    platform: 'GOOGLE_MEET',
    scheduledAt: '2026-06-28T15:00:00.000Z',
    durationMin: 60,
    host: 'Nilufar Abdullayeva',
    hasRecording: false,
    tags: ['SAT', 'Reading'],
  },
  {
    id: 'ielts-reading-time-management',
    title: 'IELTS Reading: finish all 40 questions in time',
    description:
      'Skimming vs scanning, question-type order, and the True / False / Not Given trap. Recording available below.',
    platform: 'YOUTUBE_LIVE',
    scheduledAt: '2026-05-24T13:00:00.000Z',
    durationMin: 70,
    host: 'Madina Yusupova',
    hasRecording: true,
    tags: ['IELTS', 'Reading'],
  },
  {
    id: 'study-plan-zero-to-exam',
    title: 'Building a 3-month study plan, zero to exam',
    description:
      'How to schedule practice across all four skills, when to take mock tests, and how to read your progress dashboard. Recording available below.',
    platform: 'GOOGLE_MEET',
    scheduledAt: '2026-05-10T15:00:00.000Z',
    durationMin: 55,
    host: 'Jasur Karimov',
    hasRecording: true,
    tags: ['Study plan', 'Motivation'],
  },
]
