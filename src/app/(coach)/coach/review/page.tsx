import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  PenLine,
  Mic,
  ClipboardCheck,
  Clock4,
  User as UserIcon,
  CheckCircle2,
  Send,
} from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SectionHeading } from '@/components/ui/SectionHeading'

export const metadata = {
  title: 'Grading queue',
}

/** Pull readable text out of the learner's stored response JSON. */
function responseToText(response: unknown): string {
  if (typeof response === 'string') return response
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>
    for (const key of ['text', 'value', 'answer', 'transcript', 'note']) {
      const v = obj[key]
      if (typeof v === 'string' && v.trim()) return v
    }
    return JSON.stringify(response, null, 2)
  }
  return ''
}

function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

const gradeSchema = z.object({
  answerId: z.string().min(1),
  score: z.coerce.number().int().min(0),
  maxPoints: z.coerce.number().int().min(1),
  feedback: z.string().trim().min(1, 'Feedback is required').max(4000),
})

export default async function CoachReviewPage() {
  const session = await requireRole('OWNER', 'ADMIN', 'COACH')
  const coachId = session.id
  const isModerator = session.role === 'OWNER' || session.role === 'ADMIN'

  // Students this coach is responsible for.
  const links = await prisma.coachStudent.findMany({
    where: { coachId },
    select: { studentId: true },
  })
  const studentIds = links.map((l) => l.studentId)

  // Moderators see every pending response; coaches see only their students'.
  const attemptScope = isModerator ? {} : { userId: { in: studentIds } }
  const hasScope = isModerator || studentIds.length > 0

  const answers = hasScope
    ? await prisma.answer.findMany({
        where: {
          feedback: null,
          attempt: { ...attemptScope, status: 'SUBMITTED' },
          question: { type: { in: ['ESSAY', 'SPEAKING_PROMPT'] } },
        },
        select: {
          id: true,
          response: true,
          createdAt: true,
          question: { select: { type: true, prompt: true, points: true } },
          attempt: {
            select: {
              id: true,
              submittedAt: true,
              task: { select: { title: true, track: true, skill: true } },
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 30,
      })
    : []

  // ── Server Action: save a grade ────────────────────────────────
  async function gradeAnswer(formData: FormData) {
    'use server'
    const actor = await requireRole('OWNER', 'ADMIN', 'COACH')

    const parsed = gradeSchema.safeParse({
      answerId: formData.get('answerId'),
      score: formData.get('score'),
      maxPoints: formData.get('maxPoints'),
      feedback: formData.get('feedback'),
    })
    if (!parsed.success) return

    const { answerId, score, maxPoints, feedback } = parsed.data
    const points = Math.min(score, maxPoints)

    // Re-check that this coach may grade this answer.
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      select: { attempt: { select: { userId: true } } },
    })
    if (!answer) return

    if (actor.role === 'COACH') {
      const allowed = await prisma.coachStudent.findFirst({
        where: { coachId: actor.id, studentId: answer.attempt.userId },
        select: { id: true },
      })
      if (!allowed) return
    }

    await prisma.answer.update({
      where: { id: answerId },
      data: {
        feedback,
        pointsAwarded: points,
        isCorrect: points >= maxPoints,
      },
    })

    revalidatePath('/coach/review')
  }

  const writingCount = answers.filter((a) => a.question.type === 'ESSAY').length
  const speakingCount = answers.length - writingCount

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
            Grading queue
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">
            Writing &amp; speaking to grade
          </h1>
          <p className="mt-3 max-w-xl text-navy-500 sm:text-lg">
            {isModerator
              ? 'Every submitted essay and speaking response awaiting human feedback.'
              : 'Submitted essays and speaking responses from your students that need your feedback.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="sky" className="px-3 py-1">
            <PenLine className="h-3.5 w-3.5" /> {writingCount} writing
          </Badge>
          <Badge tone="sky" className="px-3 py-1">
            <Mic className="h-3.5 w-3.5" /> {speakingCount} speaking
          </Badge>
        </div>
      </div>

      {answers.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h2 className="font-display text-xl font-bold text-navy-800">Nothing to grade</h2>
            <p className="max-w-md text-navy-500">
              {hasScope
                ? 'All submitted writing and speaking responses have feedback. New submissions will appear here automatically.'
                : 'Once an admin assigns students to you, their submitted essays and speaking responses will show up here for grading.'}
            </p>
            <Button href="/coach" variant="secondary" size="sm" className="mt-1">
              Back to overview
            </Button>
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-6">
          {answers.map((answer) => {
            const isEssay = answer.question.type === 'ESSAY'
            const text = responseToText(answer.response)
            const learner =
              [answer.attempt.user.firstName, answer.attempt.user.lastName]
                .filter(Boolean)
                .join(' ') || answer.attempt.user.email
            const maxPoints = Math.max(1, answer.question.points)
            const submitted = answer.attempt.submittedAt ?? answer.createdAt

            return (
              <li key={answer.id}>
                <Card>
                  <CardBody className="space-y-5">
                    {/* Header row */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                          {isEssay ? <PenLine className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </span>
                        <div>
                          <p className="font-display text-base font-bold text-navy-800">
                            {answer.attempt.task.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-navy-400">
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="h-3.5 w-3.5" />
                              {learner}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock4 className="h-3.5 w-3.5" />
                              {submitted.toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="navy">{answer.attempt.task.track}</Badge>
                        <Badge tone={isEssay ? 'sky' : 'accent'}>
                          {isEssay ? 'Essay' : 'Speaking'}
                        </Badge>
                      </div>
                    </div>

                    {/* Question prompt */}
                    <div className="rounded-xl bg-sky-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-navy-400">
                        Prompt
                      </p>
                      <p className="mt-1 text-sm text-navy-700">{answer.question.prompt}</p>
                    </div>

                    {/* Learner response */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-400">
                          {isEssay ? 'Essay response' : 'Speaking transcript / notes'}
                        </p>
                        {isEssay && (
                          <span className="text-xs text-navy-400">{wordCount(text)} words</span>
                        )}
                      </div>
                      {text ? (
                        <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm leading-relaxed text-navy-700">
                          {text}
                        </p>
                      ) : (
                        <p className="rounded-xl border border-dashed border-navy-200 bg-sky-50 px-4 py-3 text-sm italic text-navy-400">
                          {isEssay
                            ? 'No written text submitted.'
                            : 'Audio response submitted — listen, then grade below.'}
                        </p>
                      )}
                    </div>

                    {/* Grading form */}
                    <form
                      action={gradeAnswer}
                      className="space-y-4 border-t border-navy-100 pt-5"
                    >
                      <input type="hidden" name="answerId" value={answer.id} />
                      <input type="hidden" name="maxPoints" value={maxPoints} />

                      <div className="flex flex-wrap items-end gap-4">
                        <div className="w-28">
                          <label
                            htmlFor={`score-${answer.id}`}
                            className="mb-1.5 block text-sm font-semibold text-navy-700"
                          >
                            Score
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`score-${answer.id}`}
                              name="score"
                              type="number"
                              min={0}
                              max={maxPoints}
                              step={1}
                              required
                              defaultValue={0}
                              inputMode="numeric"
                              spellCheck={false}
                              autoCorrect="off"
                              autoCapitalize="off"
                              autoComplete="off"
                              className="w-16 rounded-xl border border-navy-200 bg-white px-3 py-2 text-center text-sm font-semibold text-navy-800 shadow-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                            />
                            <span className="text-sm font-semibold text-navy-400">
                              / {maxPoints}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`feedback-${answer.id}`}
                            className="mb-1.5 block text-sm font-semibold text-navy-700"
                          >
                            Feedback
                          </label>
                          <textarea
                            id={`feedback-${answer.id}`}
                            name="feedback"
                            rows={3}
                            required
                            placeholder="Strengths, what to improve, band/level guidance…"
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="off"
                            autoComplete="off"
                            className="w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-navy-800 shadow-sm transition-colors placeholder:text-navy-300 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="flex items-center gap-1.5 text-xs text-navy-400">
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Saving sends feedback to the learner.
                        </p>
                        <Button type="submit" variant="primary" size="sm">
                          <Send className="h-4 w-4" />
                          Save grade
                        </Button>
                      </div>
                    </form>
                  </CardBody>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
