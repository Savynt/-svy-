'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface LoginResponse {
  /** Path to send the user to, computed from their role (homeForRole). */
  redirectTo?: string
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const next: { email?: string; password?: string } = {}
    if (!email.trim()) next.email = 'Email is required.'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Password is required.'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = (await res.json().catch(() => ({}))) as LoginResponse

      if (!res.ok) {
        setFormError(data.error ?? 'Invalid email or password. Please try again.')
        return
      }

      // API returns the role-aware landing path (homeForRole).
      router.replace(data.redirectTo ?? '/dashboard')
      router.refresh()
    } catch {
      setFormError('Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <header className="mb-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-navy-500">
          Sign in to continue your exam preparation.
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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="you@gmail.com"
          value={email}
          error={fieldErrors.email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-navy-700">Password</span>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-navy-600 underline-offset-2 hover:text-navy-800 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            aria-label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Your password"
            value={password}
            error={fieldErrors.password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-navy-400">
        <span className="h-px flex-1 bg-navy-100" />
        <span>or</span>
        <span className="h-px flex-1 bg-navy-100" />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        disabled
        title="Google sign-in is coming soon"
        aria-label="Continue with Google (coming soon)"
      >
        Continue with Google
        <span className="ml-1 text-xs font-normal text-navy-400">(soon)</span>
      </Button>

      <p className="mt-6 text-center text-sm text-navy-500">
        New to Savynt?{' '}
        <Link
          href="/register"
          className="font-semibold text-navy-700 underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}
