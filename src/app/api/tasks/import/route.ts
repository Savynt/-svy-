import { z } from 'zod'
import { parseHtmlTask } from '@/lib/parser/html'
import { persistNormalizedTask } from '@/lib/tasks/persist'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/rbac'
import type { NormalizedTask, ParseResult } from '@/types/task'
import type { TaskStatus } from '@prisma/client'

/**
 * POST /api/tasks/import
 *
 * The endpoint the coach/admin Upload page calls. It accepts raw HTML for a
 * single self-grading practice file, runs it through the unified HTML parser and
 * returns a {@link NormalizedTask} preview the UI can render before committing.
 *
 * Add `?persist=1` to actually write the task to the database:
 *   - COACH            → status PENDING_REVIEW (goes to the moderation queue)
 *   - OWNER/ADMIN/DEV  → status PUBLISHED (trusted importers publish directly)
 *
 * Access is gated by the `task:import` permission (see `@/lib/rbac`).
 */

const bodySchema = z.object({
  html: z.string().min(1, 'html is required'),
  filename: z.string().min(1, 'filename is required'),
})

interface ImportPreviewResponse {
  ok: boolean
  persisted: boolean
  source: string
  warnings: string[]
  errors: string[]
  /** The parsed task (always present when ok). */
  task?: NormalizedTask
  /** Present only when the task was written to the DB. */
  saved?: {
    taskId: string
    slug: string
    status: TaskStatus
    created: boolean
    groupCount: number
    questionCount: number
  }
}

function json(data: ImportPreviewResponse | { error: string; issues?: unknown }, status = 200): Response {
  return Response.json(data, { status })
}

/** A coach's imports await moderation; trusted roles publish immediately. */
function statusForRole(role: string): TaskStatus {
  return role === 'COACH' ? 'PENDING_REVIEW' : 'PUBLISHED'
}

export async function POST(request: Request): Promise<Response> {
  // --- auth + permission -------------------------------------------------
  const session = await getSession()
  if (!session) {
    return json({ error: 'Unauthorized. Please sign in.' }, 401)
  }
  if (!can(session.role, 'task:import')) {
    return json({ error: 'You do not have permission to import tasks.' }, 403)
  }

  // --- body --------------------------------------------------------------
  let body: z.infer<typeof bodySchema>
  try {
    const raw: unknown = await request.json()
    const result = bodySchema.safeParse(raw)
    if (!result.success) {
      return json({ error: 'Invalid request body.', issues: result.error.flatten() }, 400)
    }
    body = result.data
  } catch {
    return json({ error: 'Malformed JSON body.' }, 400)
  }

  // --- parse -------------------------------------------------------------
  const parsed: ParseResult = parseHtmlTask(body.html, body.filename)

  if (!parsed.ok || !parsed.task) {
    // Parsing failed — return 422 with the parser's diagnostics so the UI can
    // tell the coach exactly what went wrong.
    return json(
      {
        ok: false,
        persisted: false,
        source: parsed.source,
        warnings: parsed.warnings,
        errors: parsed.errors.length > 0 ? parsed.errors : ['Could not extract a task from this file.'],
      },
      422,
    )
  }

  // --- preview-only (default) -------------------------------------------
  const url = new URL(request.url)
  const shouldPersist = url.searchParams.get('persist') === '1'
  if (!shouldPersist) {
    return json({
      ok: true,
      persisted: false,
      source: parsed.source,
      warnings: parsed.warnings,
      errors: parsed.errors,
      task: parsed.task,
    })
  }

  // --- persist -----------------------------------------------------------
  const status = statusForRole(session.role)
  try {
    const saved = await persistNormalizedTask(parsed.task, {
      status,
      authorId: session.id,
    })
    return json(
      {
        ok: true,
        persisted: true,
        source: parsed.source,
        warnings: parsed.warnings,
        errors: parsed.errors,
        task: parsed.task,
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
    return json({ error: `Failed to save the imported task: ${message}` }, 500)
  }
}
