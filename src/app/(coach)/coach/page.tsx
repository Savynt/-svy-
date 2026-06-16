import {
  Users,
  FileStack,
  PenLine,
  Mic,
  ArrowRight,
  Clock4,
  CheckCircle2,
  XCircle,
  FileEdit,
  Archive,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import type { TaskStatus } from '@prisma/client'
import { requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionHeading } from '@/components/ui/SectionHeading'

export const metadata = {
  title: 'Overview',
}

interface StatusMeta {
  label: string
  tone: 'navy' | 'sky' | 'accent' | 'green' | 'gray'
  icon: LucideIcon
}

const STATUS_META: Record<TaskStatus, StatusMeta> = {
  DRAFT: { label: 'Drafts', tone: 'gray', icon: FileEdit },
  PENDING_REVIEW: { label: 'Pending review', tone: 'accent', icon: Clock4 },
  PUBLISHED: { label: 'Published', tone: 'green', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', tone: 'gray', icon: XCircle },
  ARCHIVED: { label: 'Archived', tone: 'gray', icon: Archive },
}

const STATUS_ORDER: TaskStatus[] = [
  'PENDING_REVIEW',
  'PUBLISHED',
  'DRAFT',
  'REJECTED',
  'ARCHIVED',
]

export default async function CoachDashboardPage() {
  const session = await requireRole('OWNER', 'ADMIN', 'COACH')
  const coachId = session.id

  // Assigned students for this coach.
  const studentLinks = await prisma.coachStudent.findMany({
    where: { coachId },
    select: { studentId: true },
  })
  const studentIds = studentLinks.map((l) => l.studentId)

  // Tasks authored by this coach, grouped by status.
  const tasksByStatus = await prisma.task.groupBy({
    by: ['status'],
    where: { authorId: coachId },
    _count: { _all: true },
  })
  const statusCounts = new Map<TaskStatus, number>(
    tasksByStatus.map((row) => [row.status, row._count._all]),
  )
  const totalTasks = tasksByStatus.reduce((sum, row) => sum + row._count._all, 0)
  const pendingTasks = statusCounts.get('PENDING_REVIEW') ?? 0
  const publishedTasks = statusCounts.get('PUBLISHED') ?? 0

  // Writing/speaking answers from my students awaiting feedback.
  const pendingReviews = studentIds.length
    ? await prisma.answer.count({
        where: {
          feedback: null,
          attempt: { userId: { in: studentIds }, status: 'SUBMITTED' },
          question: { type: { in: ['ESSAY', 'SPEAKING_PROMPT'] } },
        },
      })
    : 0

  const writingReviews = studentIds.length
    ? await prisma.answer.count({
        where: {
          feedback: null,
          attempt: { userId: { in: studentIds }, status: 'SUBMITTED' },
          question: { type: 'ESSAY' },
        },
      })
    : 0
  const speakingReviews = pendingReviews - writingReviews

  // A few students for the snapshot list, with attempt counts.
  const students = studentIds.length
    ? await prisma.user.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cefrLevel: true,
          progress: { select: { avgScorePct: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 4,
      })
    : []

  const stats = [
    {
      label: 'Assigned students',
      value: studentIds.length,
      hint: studentIds.length === 1 ? 'learner in your group' : 'learners in your group',
      icon: Users,
      href: '/coach/students',
    },
    {
      label: 'Reviews waiting',
      value: pendingReviews,
      hint: `${writingReviews} writing · ${Math.max(0, speakingReviews)} speaking`,
      icon: Inbox,
      href: '/coach/review',
    },
    {
      label: 'Your tasks',
      value: totalTasks,
      hint: `${publishedTasks} live on the platform`,
      icon: FileStack,
      href: '/coach/upload',
    },
    {
      label: 'Awaiting moderation',
      value: pendingTasks,
      hint: 'uploads under admin review',
      icon: Clock4,
      href: '/coach/upload',
    },
  ]

  return (
    <div className="space-y-12">
      {/* Heading */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
            Coach overview
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">
            Your teaching at a glance
          </h1>
          <p className="mt-3 max-w-xl text-navy-500 sm:text-lg">
            Track your students, keep your uploaded tests moving through review, and clear the
            writing &amp; speaking grading queue.
          </p>
        </div>
        <Button href="/coach/upload" variant="accent" size="lg" className="shrink-0">
          Upload a test
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} href={stat.href} hover className="group h-full">
              <CardBody className="flex h-full flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-navy-700 transition-colors group-hover:bg-sky-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-2xl font-extrabold text-navy-800 sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-navy-600">{stat.label}</p>
                  <p className="mt-1 text-xs text-navy-400">{stat.hint}</p>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {/* Task pipeline */}
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Your uploads"
            title="Task pipeline"
            subtitle="Every test you author is moderated by an admin before it reaches learners."
          />
          <Button href="/coach/upload" variant="ghost" size="sm" className="hidden sm:inline-flex">
            New upload
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {totalTasks > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {STATUS_ORDER.map((status) => {
              const meta = STATUS_META[status]
              const Icon = meta.icon
              const count = statusCounts.get(status) ?? 0
              return (
                <Card key={status} className="h-full">
                  <CardBody className="flex h-full flex-col gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-navy-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="font-display text-2xl font-extrabold text-navy-800">{count}</p>
                    <Badge tone={count > 0 ? meta.tone : 'gray'}>{meta.label}</Badge>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-navy-700">
                <FileStack className="h-6 w-6" />
              </span>
              <p className="font-display text-lg font-bold text-navy-800">
                You haven&apos;t uploaded any tests yet
              </p>
              <p className="max-w-md text-sm text-navy-500">
                Paste or upload an HTML test, preview the parsed questions, then submit it for
                moderation. Approved tests are published to all learners.
              </p>
              <Button href="/coach/upload" variant="primary" size="sm" className="mt-1">
                Upload your first test
              </Button>
            </CardBody>
          </Card>
        )}
      </section>

      {/* Two-up: grading queue + students */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grading queue summary */}
        <section>
          <SectionHeading
            eyebrow="Needs your feedback"
            title="Grading queue"
            className="mb-6"
          />
          <Card className="h-full">
            <CardBody className="flex h-full flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-navy-100 bg-sky-50 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-navy-700">
                    <PenLine className="h-4 w-4" />
                  </span>
                  <p className="mt-3 font-display text-2xl font-extrabold text-navy-800">
                    {writingReviews}
                  </p>
                  <p className="text-sm font-semibold text-navy-600">Writing essays</p>
                </div>
                <div className="rounded-xl border border-navy-100 bg-sky-50 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-navy-700">
                    <Mic className="h-4 w-4" />
                  </span>
                  <p className="mt-3 font-display text-2xl font-extrabold text-navy-800">
                    {Math.max(0, speakingReviews)}
                  </p>
                  <p className="text-sm font-semibold text-navy-600">Speaking responses</p>
                </div>
              </div>

              {pendingReviews > 0 ? (
                <div className="mt-auto flex items-center justify-between gap-3 rounded-xl bg-accent-400/15 px-4 py-3">
                  <p className="text-sm font-semibold text-navy-700">
                    {pendingReviews} {pendingReviews === 1 ? 'response' : 'responses'} waiting
                  </p>
                  <Button href="/coach/review" variant="accent" size="sm">
                    Start grading
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-auto rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  You&apos;re all caught up — nothing to grade right now.
                </div>
              )}
            </CardBody>
          </Card>
        </section>

        {/* Students snapshot */}
        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <SectionHeading eyebrow="Your group" title="Students" />
            <Button
              href="/coach/students"
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <Card className="h-full">
            <CardBody>
              {students.length > 0 ? (
                <ul className="divide-y divide-navy-100">
                  {students.map((student) => {
                    const name =
                      [student.firstName, student.lastName].filter(Boolean).join(' ') ||
                      student.email
                    const avg =
                      student.progress.length > 0
                        ? Math.round(
                            student.progress.reduce((sum, p) => sum + p.avgScorePct, 0) /
                              student.progress.length,
                          )
                        : 0
                    return (
                      <li key={student.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-bold text-navy-700">
                          {(student.firstName?.[0] ?? student.email[0]).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-navy-800">{name}</p>
                          <div className="mt-1">
                            <ProgressBar value={avg} showLabel />
                          </div>
                        </div>
                        {student.cefrLevel && <Badge tone="sky">{student.cefrLevel}</Badge>}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-navy-700">
                    <Users className="h-5 w-5" />
                  </span>
                  <p className="font-display text-base font-bold text-navy-800">
                    No students assigned yet
                  </p>
                  <p className="max-w-xs text-sm text-navy-500">
                    An admin links learners to your group. They&apos;ll appear here once assigned.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  )
}
