'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface ResetResponse {
  error?: string
}

interface FieldErrors {
  email?: string
  code?: string
  password?: string
  confirm?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState(() => searchParams.get('email') ?? '')
  const [code, setCode] = useState(() => searchParams.get('code') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!email.trim()) next.email = 'Email is required.'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.'
    const cleanCode = code.replace(/\s/g, '')
    if (!cleanCode) next.code = 'Enter the code from your email.'
    else if (!/^\d{6}$/.test(cleanCode)) next.code = 'The code is 6 digits.'
    if (!password) next.password = 'Choose a new password.'
    else if (password.length < 8) next.password = 'Use at least 8 characters.'
    if (confirm !== password) next.confirm = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.replace(/\s/g, ''),
          password,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as ResetResponse

      if (!res.ok) {
        setFormError(data.error ?? 'That code is invalid or has expired. Please try again.')
        return
      }
      setDone(true)
    } catch {
      setFormError('Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M5 13l4 4L19 7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800">
          Password updated
        </h1>
        <p className="mt-2 text-sm text-navy-500">
          You can now sign in with your new password.
        </p>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="mt-6 w-full"
          onClick={() => router.replace('/login')}
        >
          Go to sign in
        </Button>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800">
          Set a new password
        </h1>
        <p className="mt-1.5 text-sm text-navy-500">
          Enter the code we emailed you and choose a new password.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            {formError}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@gmail.com"
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />

        <Input
          label="Reset code"
          type="text"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          maxLength={6}
          value={code}
          error={errors.code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={loading}
          required
        />

        <Input
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />

        <Input
          label="Confirm password"
          type="password"
          name="confirm"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirm}
          error={errors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading}
          required
        />

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-navy-500">
        Need a new code?{' '}
        <Link
          href="/forgot-password"
          className="font-semibold text-navy-700 underline-offset-2 hover:underline"
        >
          Request again
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="py-6 text-center text-sm text-navy-500">Loading…</div>}
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
