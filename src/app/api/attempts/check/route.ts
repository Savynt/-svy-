import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { gradeAnswer, needsManualGrading } from '@/lib/grade'
import type { Prisma } from '@prisma/client'

/**
 * POST /api/attempts/check
 * Body: { questionId, response }
 *
 * Instant per-question feedback for PRACTICE tasks only.
 * Does NOT create an Attempt — just grades the single answer against the key.
 */

const bodySchema = z.object({
  questionId: z.string().min(1),
  response: z.union([z.string(), z.array(z.string())]),
})

function asRawAnswer(v: Prisma.JsonValue): string | string[] | null {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.map(String)
  return null
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400 })

  const question = await prisma.question.findUnique({
    where: { id: parsed.data.questionId },
    include: { task: { select: { type: true, status: true } } },
  })

  if (!question || question.task.status !== 'PUBLISHED') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (question.task.type !== 'PRACTICE') {
    return Response.json({ error: 'Instant check is only available for PRACTICE tasks' }, { status: 403 })
  }
  if (needsManualGrading(question.type)) {
    return Response.json({ isCorrect: null, correctAnswer: null, explanation: null })
  }

  const correct = asRawAnswer(question.answer)
  const isCorrect = gradeAnswer(question.type, parsed.data.response, correct)

  return Response.json({ isCorrect, correctAnswer: correct, explanation: question.explanation })
}
