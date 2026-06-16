import type { Metadata } from 'next'
import {
  UserPlus,
  Activity,
  CheckCircle2,
  ClipboardCheck,
  TrendingUp,
  CalendarRange,
} from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardBody } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionHeading } from '@/components/ui/SectionHeading'

export const metadata: Metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

interface Metric {
  label: string
  value: string
  hint: string
  icon: typeof UserPlus
  tone: 'sky' | 'green' | 'accent'
}

export default async function AdminAnalyticsPage() {
  await requireRole('OWNER', 'ADMIN', 'DEVELOPER')

  const since7 = daysAgo(7)
  const since30 = daysAgo(30)

  const [
    signups7,
    signups30,
    activeUsers7,
    activeSubs,
    attemptsTotal,
    attemptsSubmitted,
    attemptsGraded,
    placements30,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: since7 } } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.attempt.count(),
    prisma.attempt.count({ where: { status: 'SUBMITTED' } }),
    prisma.attempt.count({ where: { status: 'GRADED' } }),
    prisma.placementResult.count({ where: { takenAt: { gte: since30 } } }),
  ])

  const completed = attemptsSubmitted + attemptsGraded
  const completionRate = attemptsTotal === 0 ? 0 : Math.round((completed / attemptsTotal) * 100)
  const gradedRate = completed === 0 ? 0 : Math.round((attemptsGraded / completed) * 100)

  const metrics: Metric[] = [
    {
      label: 'New sign-ups',
      value: signups7.toLocaleString('en-US'),
      hint: 'Last 7 days',
      icon: UserPlus,
      tone: 'sky',
    },
    {
      label: 'Active users',
      value: activeUsers7.toLocaleString('en-US'),
      hint: 'Seen in the last 7 days',
      icon: Activity,
      tone: 'green',
    },
    {
      label: 'Active subscriptions',
      value: activeSubs.toLocaleString('en-US'),
      hint: 'Currently paying',
      icon: CheckCircle2,
      tone: 'accent',
    },
    {
      label: 'Tests started',
      value: attemptsTotal.toLocaleString('en-US'),
      hint: 'All attempts to date',
      icon: ClipboardCheck,
      tone: 'sky',
    },
  ]

  const toneClass: Record<Metric['tone'], string> = {
    sky: 'bg-sky-100 text-navy-700',
    green: 'bg-emerald-100 text-emerald-700',
    accent: 'bg-accent-400/20 text-accent-600',
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">Insights</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
          Analytics
        </h1>
        <p className="mt-2 max-w-xl text-navy-500">
          Key growth and engagement signals across the platform.
        </p>
      </div>

      {/* Metric cards */}
      <section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label} hover className="h-full">
              <CardBody className="flex h-full flex-col gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass[m.tone]}`}
                >
                  <m.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display text-2xl font-extrabold text-navy-800 sm:text-3xl">
                    {m.value}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-navy-600">{m.label}</p>
                  <p className="mt-1 text-xs text-navy-400">{m.hint}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Rates */}
      <section>
        <SectionHeading
          eyebrow="Engagement"
          title="Completion & grading"
          subtitle="How learners progress through the tests they start."
          className="mb-5"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-navy-800">Completion rate</span>
                <span className="font-display text-lg font-extrabold text-navy-800">
                  {completionRate}%
                </span>
              </div>
              <ProgressBar value={completionRate} />
              <p className="text-xs text-navy-400">
                {completed.toLocaleString('en-US')} of {attemptsTotal.toLocaleString('en-US')}{' '}
                attempts submitted or graded.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-navy-800">
                  Graded vs. submitted
                </span>
                <span className="font-display text-lg font-extrabold text-navy-800">
                  {gradedRate}%
                </span>
              </div>
              <ProgressBar value={gradedRate} />
              <p className="text-xs text-navy-400">
                {attemptsGraded.toLocaleString('en-US')} graded of{' '}
                {completed.toLocaleString('en-US')} completed.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Secondary stats */}
      <section>
        <SectionHeading eyebrow="This month" title="30-day snapshot" className="mb-5" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardBody className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-xl font-extrabold text-navy-800">
                  {signups30.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-navy-400">New sign-ups (30d)</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                <CalendarRange className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-xl font-extrabold text-navy-800">
                  {placements30.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-navy-400">Placement tests (30d)</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-xl font-extrabold text-navy-800">
                  {attemptsGraded.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-navy-400">Tests graded (all time)</p>
              </div>
            </CardBody>
          </Card>
        </div>
        <p className="mt-4 text-xs text-navy-400">
          Counts are computed live from the database. Richer time-series charts can be layered on
          once an events pipeline is in place.
        </p>
      </section>
    </div>
  )
}
