'use client'

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const CODE_LENGTH = 6
const RESEND_SECONDS = 45

interface VerifyResponse {
  error?: string
  redirectTo?: string
}

interface ResendResponse {
  error?: string
}

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''))
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const [resending, setResending] = useState(false)
  const [resendNote, setResendNote] = useState<string | null>(null)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  const code = useMemo(() => digits.join(''), [digits])
  const complete = code.length === CODE_LENGTH

  // Resend cooldown timer.
  useEffect(() => {
    if (resendIn <= 0) return
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [resendIn])

  function focusBox(i: number) {
    inputs.current[i]?.focus()
    inputs.current[i]?.select()
  }

  function setDigit(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = char
      return next
    })
    if (char && index < CODE_LENGTH - 1) focusBox(index + 1)
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault()
      setDigits((prev) => {
        const next = [...prev]
        next[index - 1] = ''
        return next
      })
      focusBox(index - 1)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      focusBox(index - 1)
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      e.preventDefault()
      focusBox(index + 1)
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    const next = Array(CODE_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    focusBox(Math.min(pasted.length, CODE_LENGTH - 1))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (!complete) {
      setFormError('Enter all 6 digits of the code.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = (await res.json().catch(() => ({}))) as VerifyResponse

      if (!res.ok) {
        setFormError(data.error ?? 'That code is invalid or has expired. Please try again.')
        setDigits(Array(CODE_LENGTH).fill(''))
        focusBox(0)
        return
      }

      // Verified — tokens issued by the API; go to the role landing page.
      router.replace(data.redirectTo ?? '/dashboard')
      router.refresh()
    } catch {
      setFormError('Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function onResend() {
    if (resendIn > 0 || resending || !email) return
    setResending(true)
    setResendNote(null)
    setFormError(null)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resend: true }),
      })
      const data = (await res.json().catch(() => ({}))) as ResendResponse
      if (!res.ok) {
        setFormError(data.error ?? 'Could not resend the code. Please try again shortly.')
        return
      }
      setResendNote('A new code is on its way to your inbox.')
      setResendIn(RESEND_SECONDS)
    } catch {
      setFormError('Something went wrong. Check your connection and try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div>
      <header className="mb-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800">
          Verify your email
        </h1>
        <p className="mt-1.5 text-sm text-navy-500">
          We sent a 6-digit code to{' '}
          {email ? (
            <span className="font-semibold text-navy-700 break-all">{email}</span>
          ) : (
            'your email address'
          )}
          . Enter it below.
        </p>
        <p className="mt-1.5 text-xs text-navy-400">
          Can&apos;t find it? Check your{' '}
          <span className="font-medium text-navy-500">spam or junk</span> folder.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            {formError}
          </div>
        )}
        {resendNote && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700"
          >
            {resendNote}
          </div>
        )}

        <fieldset>
          <legend className="sr-only">6-digit verification code</legend>
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {digits.map((digit, i) => (
              <input
                // Fixed-length set of boxes; position is the stable identity.
                key={`code-box-${i}`}
                ref={(el) => {
                  inputs.current[i] = el
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                value={digit}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                onFocus={(e) => e.target.select()}
                disabled={loading}
                className="h-14 w-full min-w-0 rounded-xl border border-navy-200 bg-white text-center font-display text-xl font-bold text-navy-800 shadow-sm transition-colors focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-400/40 disabled:opacity-50"
              />
            ))}
          </div>
        </fieldset>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={loading || !complete}
        >
          {loading ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-navy-500">
        Didn&apos;t get the code?{' '}
        {resendIn > 0 ? (
          <span className="text-navy-400">Resend in {resendIn}s</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resending || !email}
            className="font-semibold text-navy-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-navy-500">
        Wrong address?{' '}
        <Link
          href="/register"
          className="font-semibold text-navy-700 underline-offset-2 hover:underline"
        >
          Edit registration
        </Link>
      </p>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="py-6 text-center text-sm text-navy-500">Loading verification…</div>
      }
    >
      <VerifyForm />
    </Suspense>
  )
}
