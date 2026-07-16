import { getSession } from '@/lib/auth/session'
import { saveUpload, kindForMime, maxBytesFor, ALLOWED_TYPES } from '@/lib/storage'

/**
 * POST /api/upload  (multipart/form-data, field: `file`)
 *
 * Accepts a task image (Writing Task 1 chart, SAT Math diagram) or a speaking
 * recording and returns a same-origin URL to store on the question/answer.
 *
 * Any signed-in user may upload: coaches attach images in the builder, students
 * submit speaking audio. The type/size allow-list lives in `@/lib/storage`, and
 * the stored filename is generated server-side, so nothing from the client
 * reaches the filesystem path.
 */

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session) return json({ ok: false, error: 'Unauthorized. Please sign in.' }, 401)

  let file: File | null = null
  try {
    const form = await request.formData()
    const entry = form.get('file')
    file = entry instanceof File ? entry : null
  } catch {
    return json({ ok: false, error: 'Malformed upload — expected multipart/form-data.' }, 400)
  }

  if (!file) {
    return json({ ok: false, error: 'No file received. Attach it as the "file" field.' }, 400)
  }

  const kind = kindForMime(file.type)
  if (!kind) {
    return json(
      {
        ok: false,
        error: `Unsupported file type "${file.type || 'unknown'}". Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}.`,
      },
      415,
    )
  }
  if (file.size > maxBytesFor(kind)) {
    return json(
      { ok: false, error: `File is too large. Limit is ${maxBytesFor(kind) / 1024 / 1024} MB for ${kind}.` },
      413,
    )
  }
  // A zero-byte upload is the client's mistake (e.g. a recording that captured
  // nothing), not a server fault — answer 400 rather than letting saveUpload
  // throw into the 500 branch.
  if (file.size === 0) {
    return json({ ok: false, error: 'File is empty — nothing was recorded or selected.' }, 400)
  }

  try {
    const saved = await saveUpload(file)
    return json({ ok: true, ...saved }, 201)
  } catch (err) {
    console.error('[upload] failed:', err)
    const message = err instanceof Error ? err.message : 'Could not store the file.'
    return json({ ok: false, error: message }, 500)
  }
}
