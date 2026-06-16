import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Headphones,
  BookOpen,
  Mic,
  PenLine,
} from 'lucide-react'
import type { Skill } from '@prisma/client'
import { requireRole, getSession } from '@/lib/auth/session'
import { can } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SectionHeading } from '@/components/ui/SectionHeading'

export const metadata: Metadata = {
  title: 'Content moderation',
  robots: { index: false, follow: false },
}

/** Moderation requires task:moderate; re-checked inside each action. */
async function assertModerator() {
  const session = await getSession()
  if (!session || !can(session.role, 'task:moderate')) {
    throw new Error('Forbidden: moderation requires staff access.')
  }
  return session
}

async function approveTask(formData: FormData) {
  'use server'
  await assertModerator()
  const taskId = String(formData.get('taskId') ?? '')
  if (!taskId) return

  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  })
  revalidatePath('/admin/content')
}

async function rejectTask(formData: FormData) {
  'use server'
  await assertModerator()
  const taskId = String(formData.get('taskId') ?? '')
  if (!taskId) return

  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'REJECTED' },
  })
  revalidatePath('/admin/content')
}

const SKILL_META: Record<Skill, { label: string; icon: typeof FileText }> = {
  LISTENING: { label: 'Listening', icon: Headphones },
  READING: { label: 'Reading', icon: BookOpen },
  SPEAKING: { label: 'Speaking', icon: Mic },
  WRITING: { label: 'Writing', icon: PenLine },
}

function authorName(a: { firstName: string | null; lastName: string | null; email: string } | null) {
  if (!a) return 'Unknown author'
  return [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email
}

export default async function AdminContentPage() {
  const session = await requireRole('OWNER', 'ADMIN', 'DEVELOPER')
  const canModerate = can(session.role, 'task:moderate')

  const tasks = await prisma.task.findMany({
    where: { status: 'PENDING_REVIEW' },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { questions: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
            Moderation
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
            Review queue
          </h1>
          <p className="mt-2 max-w-xl text-navy-500">
            Coach-submitted tasks awaiting approval before they go live to learners.
          </p>
        </div>
        <Badge tone={tasks.length > 0 ? 'accent' : 'gray'}>
          {tasks.length} pending
        </Badge>
      </div>

      {!canModerate && (
        <div className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-white p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-navy-400" aria-hidden="true" />
          <p className="text-sm text-navy-600">
            Your role can view the queue but not approve or reject submissions.
          </p>
        </div>
      )}

      {tasks.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Inbox className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 font-display text-lg font-bold text-navy-800">The queue is clear</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-navy-500">
              There are no tasks awaiting review. New coach submissions will land here
              automatically.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <SectionHeading
            eyebrow="Pending review"
            title={`${tasks.length} ${tasks.length === 1 ? 'submission' : 'submissions'}`}
            className="sr-only"
          />
          <div className="space-y-4">
            {tasks.map((task) => {
              const skill = SKILL_META[task.skill]
              const SkillIcon = skill.icon
              return (
                <Card key={task.id}>
                  <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                        <SkillIcon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-bold text-navy-800">
                          {task.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge tone="navy">{task.track}</Badge>
                          <Badge tone="sky">{skill.label}</Badge>
                          <Badge tone="gray">{task.type}</Badge>
                          {task.cefrLevel && <Badge tone="gray">{task.cefrLevel}</Badge>}
                        </div>
                        <p className="mt-2 text-xs text-navy-400">
                          {task._count.questions}{' '}
                          {task._count.questions === 1 ? 'question' : 'questions'} ·{' '}
                          {task.durationMin} min · by {authorName(task.author)} ·{' '}
                          {task.createdAt.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    {canModerate && (
                      <div className="flex shrink-0 gap-2 sm:flex-col lg:flex-row">
                        <form action={approveTask} className="flex-1 sm:flex-none">
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Approve
                          </button>
                        </form>
                        <form action={rejectTask} className="flex-1 sm:flex-none">
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2"
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            Reject
                          </button>
                        </form>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
