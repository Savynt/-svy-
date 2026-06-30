import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Headphones,
  BookOpen,
  Mic,
  PenLine,
  PenSquare,
  Eye,
  EyeOff,
  Archive,
  Trash2,
} from 'lucide-react'
import type { Skill, TaskStatus, Prisma } from '@prisma/client'
import { requireRole, getSession } from '@/lib/auth/session'
import { can } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const metadata: Metadata = {
  title: 'Content',
  robots: { index: false, follow: false },
}

/** Target statuses an action may move a task into, with the permission each needs. */
const STATUS_PERMISSION = {
  PUBLISHED: 'task:publish',
  DRAFT: 'task:publish',
  REJECTED: 'task:moderate',
  ARCHIVED: 'task:moderate',
} as const

async function setStatus(formData: FormData) {
  'use server'
  const session = await getSession()
  const taskId = String(formData.get('taskId') ?? '')
  const next = String(formData.get('status') ?? '') as keyof typeof STATUS_PERMISSION
  if (!session || !taskId || !(next in STATUS_PERMISSION)) return
  if (!can(session.role, STATUS_PERMISSION[next])) {
    throw new Error('Forbidden: your role cannot perform this action.')
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: next,
      // stamp publishedAt only on publish, clear it on unpublish
      ...(next === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      ...(next === 'DRAFT' ? { publishedAt: null } : {}),
    },
  })
  revalidatePath('/admin/content')
}

async function deleteTask(formData: FormData) {
  'use server'
  const session = await getSession()
  const taskId = String(formData.get('taskId') ?? '')
  if (!session || !taskId) return
  if (!can(session.role, 'task:moderate')) {
    throw new Error('Forbidden: deleting tasks requires moderation rights.')
  }
  // Children (groups, questions, attempts) cascade on delete.
  await prisma.task.delete({ where: { id: taskId } })
  revalidatePath('/admin/content')
}

const SKILL_META: Record<Skill, { label: string; icon: typeof Headphones }> = {
  LISTENING: { label: 'Listening', icon: Headphones },
  READING: { label: 'Reading', icon: BookOpen },
  SPEAKING: { label: 'Speaking', icon: Mic },
  WRITING: { label: 'Writing', icon: PenLine },
  MATH: { label: 'Math', icon: PenLine },
}

const STATUS_META: Record<
  TaskStatus,
  { label: string; tone: 'green' | 'accent' | 'gray' | 'red' | 'navy' }
> = {
  PUBLISHED: { label: 'Published', tone: 'green' },
  PENDING_REVIEW: { label: 'Pending review', tone: 'accent' },
  DRAFT: { label: 'Draft', tone: 'gray' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  ARCHIVED: { label: 'Archived', tone: 'navy' },
}

/** Filter tabs, in display order. `all` is the default. */
const FILTERS: { key: string; label: string; status?: TaskStatus }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published', status: 'PUBLISHED' },
  { key: 'pending', label: 'Pending', status: 'PENDING_REVIEW' },
  { key: 'draft', label: 'Drafts', status: 'DRAFT' },
  { key: 'rejected', label: 'Rejected', status: 'REJECTED' },
  { key: 'archived', label: 'Archived', status: 'ARCHIVED' },
]

function authorName(
  a: { firstName: string | null; lastName: string | null; email: string } | null,
) {
  if (!a) return 'Unknown'
  return [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email
}

const actionBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

export default async function AdminContentPage({
  searchParams,
}: {
  // Next.js 16 — searchParams is a Promise.
  searchParams: Promise<{ status?: string }>
}) {
  const session = await requireRole('OWNER', 'ADMIN', 'DEVELOPER')
  const canPublish = can(session.role, 'task:publish')
  const canModerate = can(session.role, 'task:moderate')

  const params = await searchParams
  const active = FILTERS.find((f) => f.key === params.status) ?? FILTERS[0]

  const where: Prisma.TaskWhereInput = active.status ? { status: active.status } : {}

  // Counts per status (for the tab badges) + the filtered list.
  const [grouped, tasks] = await Promise.all([
    prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.task.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: 100,
      include: {
        author: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { questions: true } },
      },
    }),
  ])

  const countByStatus = new Map<string, number>(grouped.map((g) => [g.status, g._count._all]))
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0)
  const countFor = (status?: TaskStatus) => (status ? countByStatus.get(status) ?? 0 : total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
            Content
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
            Tasks &amp; tests
          </h1>
          <p className="mt-2 max-w-xl text-navy-500">
            One place to create, review, publish and archive every test on the platform.
          </p>
        </div>
        <Link
          href="/coach/tasks/new"
          className="inline-flex items-center gap-2 rounded-xl bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
        >
          <PenSquare className="h-4 w-4" aria-hidden="true" />
          Build test
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const isActive = f.key === active.key
          return (
            <Link
              key={f.key}
              href={f.key === 'all' ? '/admin/content' : `/admin/content?status=${f.key}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                isActive ? 'bg-navy-700 text-white' : 'bg-white text-navy-600 hover:bg-sky-100'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${isActive ? 'text-sky-200' : 'text-navy-400'}`}>
                {countFor(f.status)}
              </span>
            </Link>
          )
        })}
      </div>

      {!canModerate && !canPublish && (
        <div className="rounded-2xl border border-navy-100 bg-white p-4 text-sm text-navy-600">
          Your role can view content but not publish or moderate it.
        </div>
      )}

      {/* List */}
      {tasks.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-navy-600">
              <Inbox className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 font-display text-lg font-bold text-navy-800">Nothing here yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-navy-500">
              No tasks in this view. Build your first test to get started.
            </p>
            <Link
              href="/coach/tasks/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
            >
              <PenSquare className="h-4 w-4" aria-hidden="true" />
              Build test
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const skill = SKILL_META[task.skill]
            const SkillIcon = skill.icon
            const statusMeta = STATUS_META[task.status]
            return (
              <Card key={task.id}>
                <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                      <SkillIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-bold text-navy-800">
                        {task.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                        <Badge tone="navy">{task.track}</Badge>
                        <Badge tone="sky">{skill.label}</Badge>
                        <Badge tone="gray">{task.type}</Badge>
                        {task.cefrLevel && <Badge tone="gray">{task.cefrLevel}</Badge>}
                      </div>
                      <p className="mt-2 text-xs text-navy-400">
                        {task._count.questions}{' '}
                        {task._count.questions === 1 ? 'question' : 'questions'} ·{' '}
                        {task.durationMin} min · by {authorName(task.author)} ·{' '}
                        {task.updatedAt.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {/* Publish — for anything not already live */}
                    {canPublish && task.status !== 'PUBLISHED' && (
                      <form action={setStatus}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="status" value="PUBLISHED" />
                        <button
                          type="submit"
                          className={`${actionBtn} bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Publish
                        </button>
                      </form>
                    )}
                    {/* Unpublish — back to draft */}
                    {canPublish && task.status === 'PUBLISHED' && (
                      <form action={setStatus}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="status" value="DRAFT" />
                        <button
                          type="submit"
                          className={`${actionBtn} border border-navy-200 bg-white text-navy-700 hover:bg-sky-50 focus-visible:ring-navy-400`}
                        >
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                          Unpublish
                        </button>
                      </form>
                    )}
                    {/* Reject — only meaningful for pending submissions */}
                    {canModerate && task.status === 'PENDING_REVIEW' && (
                      <form action={setStatus}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="status" value="REJECTED" />
                        <button
                          type="submit"
                          className={`${actionBtn} border border-navy-200 bg-white text-navy-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus-visible:ring-navy-400`}
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Reject
                        </button>
                      </form>
                    )}
                    {/* Archive — hide without deleting */}
                    {canModerate && task.status !== 'ARCHIVED' && (
                      <form action={setStatus}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="status" value="ARCHIVED" />
                        <button
                          type="submit"
                          className={`${actionBtn} border border-navy-200 bg-white text-navy-600 hover:bg-sky-50 focus-visible:ring-navy-400`}
                        >
                          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                          Archive
                        </button>
                      </form>
                    )}
                    {/* Preview the live test */}
                    {task.status === 'PUBLISHED' && (
                      <Link
                        href={`/test/${task.slug}`}
                        className={`${actionBtn} border border-navy-200 bg-white text-navy-600 hover:bg-sky-50 focus-visible:ring-navy-400`}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Preview
                      </Link>
                    )}
                    {/* Delete — permanent */}
                    {canModerate && (
                      <form action={deleteTask}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button
                          type="submit"
                          className={`${actionBtn} border border-navy-200 bg-white text-navy-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus-visible:ring-navy-400`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
