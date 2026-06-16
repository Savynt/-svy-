import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import {
  gradeAttempt,
  ieltsBandFromRaw,
  needsManualGrading,
  type GradableItem,
  type RawAnswer,
} from '@/lib/grade'
import type { Prisma } from '@prisma/client'

/**
 * POST /api/attempts
 * Body: { taskId, timeSpentSec?, answers: { questionId, response }[] }
 *
 * Creates an Attempt, auto-grades every objective Question against its stored
 * `answer`, persists Answer rows, and returns the score, percentage, IELTS band
 * estimate and per-question correctness so the client can render results.
 * Essay / speaking answers are stored and flagged needs-grading.
 */

const answerValueSchema = z.union([z.string(), z.array(z.string())])

const bodySchema = z.object({
  taskId: z.string().min(1),
  timeSpentSec: z.number().int().nonnegative().optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        response: answerValueSchema,
      }),
    )
    .default([]),
})

export interface AttemptQuestionResult {
  questionId: string
  isCorrect: boolean | null
  pointsAwarded: number
  points: number
  correctAnswer: RawAnswer
  explanation: string | null
  needsGrading: boolean
}

export interface AttemptResultResponse {
  attemptId: string
  status: 'SUBMITTED' | 'GRADED'
  score: number
  totalPoints: number
  correctCount: number
  gradedCount: number
  percent: number
  bandEstimate: number | null
  needsGradingCount: number
  results: AttemptQuestionResult[]
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

/** Narrow the Prisma Json `answer` field to our RawAnswer union. */
function asRawAnswer(value: Prisma.JsonValue): RawAnswer {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map((v) => String(v))
  return null
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return json({ error: 'Unauthorized. Please sign in to submit an attempt.' }, 401)
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    const raw = await request.json()
    const result = bodySchema.safeParse(raw)
    if (!result.success) {
      return json({ error: 'Invalid request body.', issues: result.error.flatten() }, 400)
    }
    parsed = result.data
  } catch {
    return json({ error: 'Malformed JSON body.' }, 400)
  }

  const task = await prisma.task.findUnique({
    where: { id: parsed.taskId },
    include: { questions: { orderBy: { order: 'asc' } } },
  })

  if (!task) {
    return json({ error: 'Task not found.' }, 404)
  }
  if (task.questions.length === 0) {
    return json({ error: 'This task has no questions to grade.' }, 422)
  }

  // Map learner responses by questionId, ignoring unknown ids.
  const responseById = new Map<string, RawAnswer>()
  for (const a of parsed.answers) {
    responseById.set(a.questionId, a.response)
  }

  // Build gradable items in question order (one per real question).
  const items: GradableItem[] = task.questions.map((q) => ({
    type: q.type,
    response: responseById.get(q.id) ?? null,
    correct: asRawAnswer(q.answer),
    points: q.points,
  }))

  const { items: graded, summary } = gradeAttempt(items)

  const needsGradingCount = task.questions.filter((q) => needsManualGrading(q.type)).length
  const fullyGraded = needsGradingCount === 0

  // IELTS band only when this is an IELTS task with auto-gradable questions.
  const bandEstimate =
    task.track === 'IELTS' && summary.gradedCount > 0
      ? ieltsBandFromRaw(summary.correctCount, summary.gradedCount)
      : null

  const now = new Date()

  // Persist attempt + answers atomically.
  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.attempt.create({
      data: {
        userId: session.id,
        taskId: task.id,
        status: fullyGraded ? 'GRADED' : 'SUBMITTED',
        score: summary.score,
        totalPoints: summary.totalPoints,
        bandEstimate,
        timeSpentSec: parsed.timeSpentSec ?? null,
        submittedAt: now,
        gradedAt: fullyGraded ? now : null,
      },
    })

    await tx.answer.createMany({
      data: task.questions.map((q, i) => {
        const g = graded[i]
        const response = responseById.get(q.id) ?? null
        return {
          attemptId: created.id,
          questionId: q.id,
          response: (response ?? null) as Prisma.InputJsonValue,
          isCorrect: g.isCorrect,
          pointsAwarded: g.isCorrect === null ? null : g.pointsAwarded,
        }
      }),
    })

    return created
  })

  const results: AttemptQuestionResult[] = task.questions.map((q, i) => {
    const g = graded[i]
    const needsGrading = needsManualGrading(q.type)
    return {
      questionId: q.id,
      isCorrect: g.isCorrect,
      pointsAwarded: g.pointsAwarded,
      points: q.points,
      // Only reveal the key for objective questions.
      correctAnswer: needsGrading ? null : asRawAnswer(q.answer),
      explanation: q.explanation,
      needsGrading,
    }
  })

  const payload: AttemptResultResponse = {
    attemptId: attempt.id,
    status: fullyGraded ? 'GRADED' : 'SUBMITTED',
    score: summary.score,
    totalPoints: summary.totalPoints,
    correctCount: summary.correctCount,
    gradedCount: summary.gradedCount,
    percent: summary.percent,
    bandEstimate,
    needsGradingCount,
    results,
  }

  return json(payload, 201)
}
