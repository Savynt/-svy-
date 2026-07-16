'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Microphone recorder for SPEAKING_PROMPT answers.
 *
 * Records with MediaRecorder, uploads the blob to /api/upload and hands the
 * resulting same-origin URL back to the runner, which stores it on the answer
 * as `{ audioUrl, notes }`. Playback uses the uploaded URL, so what the student
 * hears is exactly what the coach will hear.
 *
 * The mic is a hard requirement of the exam, but browsers can refuse it
 * (denied permission, insecure origin, unsupported device). Every failure is
 * surfaced in-place and the notes field stays usable, so a student is never
 * left with no way to answer.
 */

export interface SpeakingAnswer {
  audioUrl: string
  notes?: string
}

/** Pick a container the browser can actually record. Safari ≠ Chrome here. */
function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  if (typeof MediaRecorder === 'undefined') return undefined
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

type Phase = 'idle' | 'recording' | 'uploading'

export function SpeakingRecorder({
  audioUrl,
  onAudioChange,
  locked,
  maxSeconds = 180,
}: {
  audioUrl: string | undefined
  onAudioChange: (url: string | undefined) => void
  locked: boolean
  /** Part 2 long turn runs ~2 min; stop well past it rather than mid-sentence. */
  maxSeconds?: number
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const tickRef = useRef<number | null>(null)

  /** Release the mic — the browser keeps the tab's "recording" indicator otherwise. */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  useEffect(() => releaseStream, [releaseStream])

  const upload = useCallback(
    async (blob: Blob, mime: string) => {
      setPhase('uploading')
      try {
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
        const form = new FormData()
        form.append('file', new File([blob], `speaking.${ext}`, { type: blob.type || mime }))

        const res = await fetch('/api/upload', { method: 'POST', body: form })
        const data: { ok?: boolean; url?: string; error?: string } = await res
          .json()
          .catch(() => ({}))

        if (!res.ok || !data.ok || !data.url) {
          throw new Error(data.error ?? `Upload failed (${res.status}).`)
        }
        onAudioChange(data.url)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not upload the recording.')
      } finally {
        setPhase('idle')
      }
    },
    [onAudioChange],
  )

  const stop = useCallback(() => {
    recorderRef.current?.state === 'recording' && recorderRef.current.stop()
  }, [])

  const start = useCallback(async () => {
    setError(null)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot record audio. Try Chrome, or type notes below.')
      return
    }
    const mimeType = pickMimeType()
    if (!mimeType) {
      setError('This browser cannot record audio. Try Chrome, or type notes below.')
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      setError(
        name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow it in your browser, then press Record again.'
          : name === 'NotFoundError'
            ? 'No microphone found. Plug one in, then press Record again.'
            : 'Could not start the microphone.',
      )
      return
    }

    streamRef.current = stream
    chunksRef.current = []

    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      releaseStream()
      const blob = new Blob(chunksRef.current, { type: mimeType })
      chunksRef.current = []
      if (blob.size > 0) void upload(blob, mimeType)
      else setPhase('idle')
    }
    recorder.onerror = () => {
      releaseStream()
      setError('Recording stopped unexpectedly.')
      setPhase('idle')
    }

    recorder.start()
    setPhase('recording')
    setElapsed(0)
    tickRef.current = window.setInterval(() => {
      setElapsed((s) => {
        const next = s + 1
        if (next >= maxSeconds) stop()
        return next
      })
    }, 1000)
  }, [maxSeconds, releaseStream, stop, upload])

  const discard = useCallback(() => {
    onAudioChange(undefined)
    setElapsed(0)
    setError(null)
  }, [onAudioChange])

  return (
    <div className="space-y-2 rounded-xl border border-navy-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-3">
        {phase === 'recording' ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700"
          >
            <Square className="h-3.5 w-3.5" /> Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={locked || phase === 'uploading'}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === 'uploading' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" /> {audioUrl ? 'Record again' : 'Record answer'}
              </>
            )}
          </button>
        )}

        {phase === 'recording' && (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-red-600">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" aria-hidden />
            {formatDuration(elapsed)}
            <span className="text-navy-400">/ {formatDuration(maxSeconds)}</span>
          </span>
        )}

        {audioUrl && phase === 'idle' && (
          <>
            <audio controls src={audioUrl} className="h-9 max-w-full" />
            {!locked && (
              <button
                type="button"
                onClick={discard}
                className="inline-flex items-center gap-1.5 text-xs text-navy-400 transition hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {!audioUrl && phase === 'idle' && !error && (
        <p className={cn('text-xs text-navy-400')}>
          Press Record and speak your answer. Your recording is saved with the attempt for coach review.
        </p>
      )}
    </div>
  )
}
