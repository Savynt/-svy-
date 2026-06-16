import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/rbac'
import { persistNormalizedTask } from '@/lib/tasks/persist'
import { builderTaskSchema, builderToNormalized } from '@/types/builder'
import type { TaskStatus } from '@prisma/client'

/**
 * POST /api/tasks/manual
 *
 * The endpoint the manual Test Builder posts to. It takes a hand-authored
 * {@link BuilderTask}, lowers it to the unified NormalizedTask and writes it via
 * the shared persist layer (one atomic transaction, idempotent by slug).
 *
 * Status policy (mirrors the importer):
 *   - COACH                    → PENDING_REVIEW (admin moderates before it goes live)
 *   - OWNER / ADMIN / DEV      → PUBLISHED when `publish: true`, else DRAFT
 *
 * Gated by the `task:create` permission (OWNER, ADMIN, COACH).
 */

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

function statusFor(role: string, publish: boolean): TaskStatus {
  if (role === 'COACH') return 'PENDING_REVIEW'
  return publish ? 'PUBLISHED' : 'DRAFT'
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session) return json({ error: 'Unauthorized. Please sign in.' }, 401)
  if (!can(session.role, 'task:create')) {
    return json({ error: 'You do not have permission to create tasks.' }, 403)
  }

  // --- body --------------------------------------------------------------
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Malformed JSON body.' }, 400)
  }

  const parsed = builderTaskSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Some fields need fixing.', issues: parsed.error.flatten() }, 400)
  }

  // --- lower to the unified contract (validates answer keys) -------------
  let normalized
  try {
    normalized = builderToNormalized(parsed.data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid answer key.'
    return json({ error: message }, 400)
  }

  // --- persist -----------------------------------------------------------
  const status = statusFor(session.role, parsed.data.publish)
  try {
    const saved = await persistNormalizedTask(normalized, { status, authorId: session.id })
    return json(
      {
        ok: true,
        saved: {
          taskId: saved.taskId,
          slug: saved.slug,
          status,
          created: saved.created,
          groupCount: saved.groupCount,
          questionCount: saved.questionCount,
        },
      },
      saved.created ? 201 : 200,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error while saving the task.'
    return json({ error: `Failed to save the task: ${message}` }, 500)
  }
}
