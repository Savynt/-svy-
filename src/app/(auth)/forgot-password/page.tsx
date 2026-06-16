'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface ForgotResponse {
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError('Email is required.')
      return false
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email address.')
      return false
    }
    setEmailError(undefined)
    return true
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = (await res.json().catch(() => ({}))) as ForgotResponse

      if (!res.ok) {
        setFormError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      // Always show success — never reveal whether the email exists.
      setSent(true)
    } catch {
      setFormError('Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    const target = email.trim().toLowerCase()
    return (
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M4 7l8 5 8-5M4 7v10a1 1 0 001 1h14a1 1 0 001-1V7M4 7a1 1 0 011-1h14a1 1 0 011 1"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800">
          Check your inbox
        </h1>
        <p className="mt-2 text-sm text-navy-500">
          If an account exists for{' '}
          <span className="font-semibold text-navy-700 break-all">{target}</span>, we&apos;ve sent a
          password reset code. Enter it on the next step.
        </p>
        <div className="mt-6 space-y-3">
          <Button href="/reset-password" variant="primary" size="lg" className="w-full">
            Enter reset code
          </Button>
          <Button href="/login" variant="ghost" size="lg" className="w-full">
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800">
          Forgot your password?
        </h1>
        <p className="mt-1.5 text-sm text-navy-500">
          Enter your email and we&apos;ll send you a code to reset it.
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
          error={emailError}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset code'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-navy-500">
        Remembered it?{' '}
        <Link
          href="/login"
          className="font-semibold text-navy-700 underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
