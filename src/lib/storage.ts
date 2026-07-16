import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { env } from '@/lib/env'

/**
 * File storage for user-uploaded content: task images (Writing Task 1 charts,
 * SAT Math diagrams) and speaking recordings.
 *
 * Design notes:
 *  - Files live under {@link env.UPLOAD_DIR} — a mounted Railway Volume in prod,
 *    so they survive redeploys. Locally it's a gitignored folder.
 *  - Served back through `/api/files/<name>` on our own origin, which means the
 *    CSP needs no new host. (Third-party hosts have bitten us twice already.)
 *  - **The server always invents the filename** (uuid + extension derived from a
 *    validated MIME allow-list). Nothing from the client reaches the path, so
 *    path traversal is impossible by construction rather than by sanitising.
 */

/** MIME → file extension. Anything absent from this map is rejected. */
const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const AUDIO_TYPES: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
}

export const ALLOWED_TYPES: Record<string, string> = { ...IMAGE_TYPES, ...AUDIO_TYPES }

/** Size ceilings. Speaking answers are long-form, so audio gets more room. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // 25 MB

export type UploadKind = 'image' | 'audio'

export function kindForMime(mime: string): UploadKind | null {
  if (mime in IMAGE_TYPES) return 'image'
  if (mime in AUDIO_TYPES) return 'audio'
  return null
}

export function maxBytesFor(kind: UploadKind): number {
  return kind === 'audio' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES
}

/**
 * Upload root. Taken verbatim from env — absolute on Railway (the mounted
 * Volume), relative to the process cwd locally.
 *
 * Deliberately not built with `resolve(process.cwd(), …)`: that made Turbopack's
 * file tracer treat the whole project as reachable and balloon the standalone
 * output.
 */
function uploadRoot(): string {
  return env.UPLOAD_DIR
}

/**
 * Stored names are always `<uuid>.<ext>`. Reading validates against this shape,
 * so a crafted name can never escape the upload root.
 */
const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/

export interface StoredFile {
  /** Filename on disk, e.g. "9f1c….webm". */
  name: string
  /** Same-origin URL to hand to the browser. */
  url: string
  bytes: number
  mime: string
}

/**
 * Persist a validated upload. Throws on a disallowed MIME type or oversize file
 * so callers can surface a precise message.
 */
export async function saveUpload(file: File): Promise<StoredFile> {
  const mime = file.type
  const kind = kindForMime(mime)
  if (!kind) {
    throw new Error(`Unsupported file type "${mime || 'unknown'}".`)
  }

  const limit = maxBytesFor(kind)
  if (file.size > limit) {
    throw new Error(`File is too large (${Math.round(file.size / 1024 / 1024)} MB). Limit is ${limit / 1024 / 1024} MB.`)
  }
  if (file.size === 0) {
    throw new Error('File is empty.')
  }

  const name = `${crypto.randomUUID()}.${ALLOWED_TYPES[mime]}`
  const root = uploadRoot()
  await mkdir(root, { recursive: true })
  await writeFile(join(root, name), Buffer.from(await file.arrayBuffer()))

  return { name, url: `/api/files/${name}`, bytes: file.size, mime }
}

/** Read a stored file, or null when the name is malformed / missing. */
export async function readUpload(
  name: string,
): Promise<{ body: Buffer; mime: string; bytes: number } | null> {
  if (!STORED_NAME.test(name)) return null

  const path = join(uploadRoot(), name)
  try {
    const info = await stat(path)
    if (!info.isFile()) return null
    const ext = name.split('.').pop()!
    const mime = Object.keys(ALLOWED_TYPES).find((m) => ALLOWED_TYPES[m] === ext)
    if (!mime) return null
    return { body: await readFile(path), mime, bytes: info.size }
  } catch {
    return null
  }
}
