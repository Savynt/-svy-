import type { Metadata } from 'next'
import {
  TrendingUp,
  BookOpenCheck,
  Target,
  Flame,
  ArrowRight,
  Crown,
  SpellCheck2,
  GraduationCap,
  Compass,
  Rocket,
  type LucideIcon,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser, getCurrentUser } from '@/lib/auth/session'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { StatCard } from '@/components/student/StatCard'
import { TaskRow } from '@/components/student/TaskRow'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your SVY learning snapshot — progress, stats and what to practice next.',
}

interface QuickLink {
  href: string
  title: string
  blurb: string
  icon: LucideIcon
}

const QUICK_LINKS: QuickLink[] = [
  {
    href: '/practice',
    title: 'Practice library',
    blurb: 'Browse every IELTS, SAT and General English set by skill.',
    icon: Compass,
  },
  {
    href: '/practice',
    title: 'Build vocabulary',
    blurb: 'Grow your word bank from Beginner to Band 8+.',
    icon: SpellCheck2,
  },
  {
    href: '/pricing',
    title: 'Your subscription',
    blurb: 'One plan unlocks all tracks, skills and mock tests.',
    icon: GraduationCap,
  },
]

const ACTIVE_STATUSES = ['ACTIVE', 'TRIALING'] as const

function levelLabel(cefrLevel: string | null, min: number | null, max: number | null): string | null {
  if (cefrLevel) return cefrLevel
  if (min != null && max != null) return `Band ${min}–${max}`
  if (min != null) return `Band ${min}+`
  return null
}

function firstNameOf(user: { firstName: string | null; name: string | null; email: string }): string {
  if (user.firstName?.trim()) return user.firstName.trim()
  if (user.name?.trim()) return user.name.trim().split(' ')[0]
  return user.email.split('@')[0]
}

export default async function DashboardPage() {
  // Auth gate — also opts the route into dynamic rendering (reads cookies).
  await requireUser()
  const user = await getCurrentUser()

  // requireUser already guaranteed a session; this satisfies the type and
  // covers the unlikely race where the user row was deleted mid-request.
  if (!user) {
    return (
      <div className="container-app py-16">
        <Card>
          <CardBody className="text-center">
            <p className="font-display text-lg font-bold text-navy-800">Session expired</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-navy-500">
              Please sign in again to continue.
            </p>
            <div className="mt-4">
              <Button href="/login" variant="primary" size="sm">
                Go to login
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  // Fetch everything the dashboard needs in parallel.
  const [subscription, gradedCount, scoreAgg, skillsTracked, inProgress, recommendedTasks] =
    await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: user.id, status: { in: [...ACTIVE_STATUSES] } },
        orderBy: { currentPeriodEnd: 'desc' },
        include: { plan: true },
      }),
      prisma.attempt.count({ where: { userId: user.id, status: 'GRADED' } }),
      prisma.attempt.aggregate({
        where: { userId: user.id, status: 'GRADED', score: { not: null }, totalPoints: { gt: 0 } },
        _sum: { score: true, totalPoints: true },
      }),
      prisma.skillProgress.count({ where: { userId: user.id } }),
      prisma.attempt.findMany({
        where: { userId: user.id, status: 'IN_PROGRESS', task: { status: 'PUBLISHED' } },
        orderBy: { startedAt: 'desc' },
        take: 3,
        select: {
          taskId: true,
          task: {
            select: {
              id: true,
              title: true,
              track: true,
              skill: true,
              cefrLevel: true,
              ieltsBandMin: true,
              ieltsBandMax: true,
              durationMin: true,
              _count: { select: { questions: true } },
            },
          },
        },
      }),
      prisma.task.findMany({
        where: { status: 'PUBLISHED', attempts: { none: { userId: user.id } } },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 4,
        select: {
          id: true,
          title: true,
          track: true,
          skill: true,
          cefrLevel: true,
          ieltsBandMin: true,
          ieltsBandMax: true,
          durationMin: true,
          _count: { select: { questions: true } },
        },
      }),
    ])

  const isSubscribed = subscription !== null
  const firstName = firstNameOf(user)

  // Derived stats (safe on an empty DB).
  const totalScore = scoreAgg._sum.score ?? 0
  const totalPoints = scoreAgg._sum.totalPoints ?? 0
  const avgScorePct = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : null
  const planName = subscription?.plan.name ?? null

  const stats = [
    {
      label: 'Tests completed',
      value: gradedCount.toLocaleString('en-US'),
      hint: gradedCount === 0 ? 'Finish your first test' : 'Graded attempts',
      icon: BookOpenCheck,
    },
    {
      label: 'Average score',
      value: avgScorePct === null ? '—' : `${avgScorePct}%`,
      hint: avgScorePct === null ? 'No graded tests yet' : 'Across graded tests',
      icon: TrendingUp,
    },
    {
      label: 'Day streak',
      value: '0',
      hint: 'Practice today to begin',
      icon: Flame,
    },
  ]

  // Attempt.task is a required relation, so each selected task is non-null.
  const continueLearning = inProgress.map((a) => a.task)

  return (
    <div>
      {/* Header band */}
      <section className="border-b border-navy-100 bg-gradient-to-br from-white via-sky-50 to-sky-100">
        <div className="container-app py-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
                Dashboard
              </p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">
                Welcome back, {firstName} <span aria-hidden="true">👋</span>
              </h1>
              <p className="mt-3 max-w-xl text-navy-500 sm:text-lg">
                Here&apos;s your learning snapshot. Pick up where you left off and keep building
                toward your target score.
              </p>
            </div>

            <div className="shrink-0">
              {isSubscribed ? (
                <div className="inline-flex flex-col items-start gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-card sm:items-end">
                  <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                    Plan
                  </span>
                  <Badge tone="green">
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" /> {planName ?? 'Active'}
                  </Badge>
                </div>
              ) : (
                <Badge tone="sky" className="px-3 py-1">
                  Free account
                </Badge>
              )}
            </div>
          </div>

          {!isSubscribed && (
            <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-accent-400/40 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-400/20">
                  <Crown className="h-5 w-5 text-accent-600" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-navy-800">
                    Subscribe to unlock everything
                  </h2>
                  <p className="mt-1 text-sm text-navy-500">
                    Get every IELTS, SAT and General English test, instant scoring and saved progress —
                    one simple plan.
                  </p>
                </div>
              </div>
              <Button href="/pricing" variant="accent" size="lg" className="shrink-0">
                Subscribe — see plans
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="container-app py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              icon={stat.icon}
            />
          ))}
        </div>

        {/* Continue learning */}
        <section className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Pick up where you left off"
              title="Continue learning"
              subtitle="Tests you've started but haven't finished yet."
            />
            <Button
              href="/practice"
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              Browse all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {continueLearning.length > 0 ? (
            <div className="grid gap-3">
              {continueLearning.map((task) => (
                <TaskRow
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  track={task.track}
                  skill={task.skill}
                  level={levelLabel(task.cefrLevel, task.ieltsBandMin, task.ieltsBandMax)}
                  durationMin={task.durationMin}
                  questionCount={task._count.questions}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-navy-700">
                  <Rocket className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-navy-800">
                    Nothing in progress yet
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-navy-500">
                    Start a practice test and it will show up here so you can jump right back in.
                  </p>
                </div>
                <Button href="/practice" variant="secondary" size="sm">
                  Explore practice
                </Button>
              </CardBody>
            </Card>
          )}
        </section>

        {/* Recommended */}
        <section className="mt-12">
          <SectionHeading
            eyebrow="Fresh challenges"
            title="Recommended for you"
            subtitle="New published tests we think you're ready to take on."
            className="mb-5"
          />

          {recommendedTasks.length > 0 ? (
            <div className="grid gap-3">
              {recommendedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  track={task.track}
                  skill={task.skill}
                  level={levelLabel(task.cefrLevel, task.ieltsBandMin, task.ieltsBandMax)}
                  durationMin={task.durationMin}
                  questionCount={task._count.questions}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-navy-700">
                  <Compass className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-navy-800">
                    No tests published yet
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-navy-500">
                    New practice sets are added regularly. Check the practice library to see what&apos;s
                    available.
                  </p>
                </div>
                <Button href="/practice" variant="secondary" size="sm">
                  Open practice library
                </Button>
              </CardBody>
            </Card>
          )}
        </section>

        {/* Quick links */}
        <section className="mt-12">
          <SectionHeading eyebrow="Keep building" title="Quick links" className="mb-5" />
          <div className="grid gap-4 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Card key={link.title} hover href={link.href} className="group h-full">
                <CardBody className="flex h-full flex-col">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-navy-700 transition-colors group-hover:bg-sky-200">
                    <link.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-navy-800">{link.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-navy-500">{link.blurb}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700">
                    Open
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
