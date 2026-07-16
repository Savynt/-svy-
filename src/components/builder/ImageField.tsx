'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Image picker for a question: upload a file, or paste a link.
 *
 * Uploading is the primary path — the file lands on our own Volume via
 * /api/upload and is served from our origin, so it can't be blocked by the CSP
 * and can't disappear when a third-party host prunes it. Pasting a link still
 * works for images already hosted on the allow-listed hosts (Imgur / ImgBB /
 * Postimages), which is how the earlier tasks were authored.
 */
export function ImageField({
  value,
  onChange,
  inputCls,
}: {
  value: string
  onChange: (url: string) => void
  inputCls: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function upload(file: File) {
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data: { ok?: boolean; url?: string; error?: string } = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok || !data.url) throw new Error(data.error ?? `Upload failed (${res.status}).`)
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the image.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-medium text-navy-600 transition hover:bg-navy-50 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" /> Upload image
            </>
          )}
        </button>
        <span className="text-xs text-navy-300">or paste a link →</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1 text-xs text-navy-400 transition hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void upload(f)
        }}
      />

      <input
        className={cn(inputCls, 'text-sm')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Image URL (optional) — or upload a file above"
      />

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {value && (
        <img
          src={value}
          alt="preview"
          className="max-h-48 w-full rounded-lg border border-navy-100 object-contain"
        />
      )}
    </div>
  )
}
