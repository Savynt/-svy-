import { getSession } from '@/lib/auth/session'
import { readUpload } from '@/lib/storage'

/**
 * GET /api/files/<name> — serve an uploaded task image or speaking recording.
 *
 * Sign-in required: recordings are a student's own answers, so they must not be
 * fetchable by anyone holding the URL. Task images ride the same route, which is
 * fine — only signed-in users ever sit a test.
 *
 * `readUpload` validates the name against the stored `<uuid>.<ext>` shape and
 * returns null for anything else, so a crafted path cannot escape the root.
 *
 * Next.js 16: `params` is a Promise — await it before use.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { name } = await params
  const file = await readUpload(name)
  if (!file) return new Response('Not found', { status: 404 })

  return new Response(new Uint8Array(file.body), {
    headers: {
      'Content-Type': file.mime,
      'Content-Length': String(file.bytes),
      // Immutable: the filename is a fresh uuid per upload, so it never changes.
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
