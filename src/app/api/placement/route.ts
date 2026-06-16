import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { scorePlacement } from '@/lib/placement'

/**
 * POST /api/placement
 * Body: { answers: { questionId, correct }[] }
 *
 * Re-scores the answered items against the built-in bank (authoritative — the
 * client only reports which questions it served and whether each was right),
 * derives a CEFR level + rough IELTS band via `@/lib/placement`, then persists a
 * `PlacementResult` and stamps the level onto `user.cefrLevel`. Requires auth.
 */

const bodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(64),
        correct: z.boolean(),
      }),
    )
    .min(1, 'No answers submitted.')
    .max(40),
})

export interface PlacementResponse {
  resultId: string
  cefrLevel: string
  cefrLabel: string
  ieltsBand: number | null
  correctCount: number
  total: number
  guidance: {
    label: string
    summary: string
    focus: string[]
  }
  perLevel: Array<{ level: string; correct: number; total: number }>
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return json({ error: 'Please sign in to take the placement test.' }, 401)
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

  const scored = scorePlacement(parsed.answers)

  // Nothing in the bank matched — refuse rather than save a meaningless A1.
  if (scored.total === 0) {
    return json({ error: 'No valid answers to score.' }, 422)
  }

  const details: Prisma.InputJsonValue = {
    ability: Number(scored.ability.toFixed(3)),
    correctCount: scored.correctCount,
    total: scored.total,
    perLevel: scored.perLevel,
  }

  // Save the result and stamp the level on the user in one transaction.
  const placement = await prisma.$transaction(async (tx) => {
    const created = await tx.placementResult.create({
      data: {
        userId: session.id,
        cefrLevel: scored.level,
        ieltsBandEstimate: scored.ieltsBand,
        details,
      },
      select: { id: true },
    })

    await tx.user.update({
      where: { id: session.id },
      data: { cefrLevel: scored.level },
    })

    return created
  })

  const payload: PlacementResponse = {
    resultId: placement.id,
    cefrLevel: scored.level,
    cefrLabel: scored.guidance.label,
    ieltsBand: scored.ieltsBand,
    correctCount: scored.correctCount,
    total: scored.total,
    guidance: {
      label: scored.guidance.label,
      summary: scored.guidance.summary,
      focus: scored.guidance.focus,
    },
    perLevel: scored.perLevel,
  }

  return json(payload, 201)
}
