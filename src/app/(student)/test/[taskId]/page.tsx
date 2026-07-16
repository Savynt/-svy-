import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/rbac'
import { sanitizeHtml } from '@/lib/sanitize'
import { TestRunner, type RunnerTask } from '@/components/test/TestRunner'
import type { Prisma } from '@prisma/client'

/**
 * Test-taking page (Server Component).
 * Next.js 16: `params` is a Promise — await it before use.
 * Loads the published Task with its groups + questions (ordered) and hands a
 * client-safe shape to <TestRunner>. The answer key is NOT sent to the client —
 * grading happens server-side in /api/attempts.
 */

export const metadata: Metadata = {
  title: 'Test · Savynt',
  robots: { index: false, follow: false },
}

/** Narrow Prisma Json `data` to a plain record for the client. */
function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

/** A learner answer hint — only the SHAPE (single vs multi), never the key. */
function answerArity(value: Prisma.JsonValue): number {
  if (Array.isArray(value)) return value.length
  return 1
}

export default async function TestPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const { taskId } = await params

  const session = await getSession()
  if (!session) {
    redirect(`/login?next=/test/${taskId}`)
  }

  // Students only ever open published tasks. Moderators must be able to preview
  // a pending/draft submission — otherwise the only way to judge a coach's task
  // before approving it is to publish it to students first and look afterwards.
  const canPreviewUnpublished = can(session.role, 'task:moderate')

  const task = await prisma.task.findFirst({
    // taskId may arrive as the cuid id or the human slug.
    where: {
      OR: [{ id: taskId }, { slug: taskId }],
      ...(canPreviewUnpublished ? {} : { status: 'PUBLISHED' }),
    },
    include: {
      groups: {
        orderBy: { order: 'asc' },
        include: { questions: { orderBy: { order: 'asc' } } },
      },
      questions: {
        where: { groupId: null },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!task) notFound()

  // Build the client task: strip answer keys, keep prompts + presentation data.
  const groups: RunnerTask['groups'] = task.groups.map((g) => ({
    id: g.id,
    order: g.order,
    type: g.type,
    instruction: g.instruction,
    data: asRecord(g.data),
    questions: g.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      data: asRecord(q.data),
      points: q.points,
      blankCount: answerArity(q.answer),
    })),
  }))

  // Questions not attached to a group become a synthetic "ungrouped" block so
  // every question still renders with sensible instructions.
  const looseQuestions = task.questions
  const ungrouped: RunnerTask['groups'] =
    looseQuestions.length > 0
      ? [
          {
            id: `task-${task.id}-ungrouped`,
            order: Number.MAX_SAFE_INTEGER,
            type: looseQuestions[0].type,
            instruction: task.instructions ?? 'Answer the questions below.',
            data: null,
            questions: looseQuestions.map((q) => ({
              id: q.id,
              order: q.order,
              type: q.type,
              prompt: q.prompt,
              data: asRecord(q.data),
              points: q.points,
              blankCount: answerArity(q.answer),
            })),
          },
        ]
      : []

  const runnerTask: RunnerTask = {
    id: task.id,
    slug: task.slug,
    title: task.title,
    track: task.track,
    skill: task.skill,
    type: task.type,
    cefrLevel: task.cefrLevel,
    durationMin: task.durationMin,
    instructions: task.instructions,
    passageHtml: task.passageHtml ? sanitizeHtml(task.passageHtml) : null,
    audioUrl: task.audioUrl,
    transcript: task.transcript,
    groups: [...groups, ...ungrouped].sort((a, b) => a.order - b.order),
  }

  // Make it obvious this isn't live content — a moderator opening a pending task
  // should never mistake it for what students actually see.
  if (task.status !== 'PUBLISHED') {
    return (
      <>
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900">
          <strong>Preview — {task.status.toLowerCase().replace('_', ' ')}.</strong>{' '}
          Students cannot see this task yet. Publish it from{' '}
          <a href="/admin/content?status=pending" className="underline underline-offset-2">
            Content
          </a>
          .
        </div>
        <TestRunner task={runnerTask} />
      </>
    )
  }

  return <TestRunner task={runnerTask} />
}
