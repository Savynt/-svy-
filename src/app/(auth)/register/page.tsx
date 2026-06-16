'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface RegisterResponse {
  error?: string
  /** Server may echo the normalized email used for the verification step. */
  email?: string
}

interface FieldErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  password?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Uzbek mobile numbers: +998 followed by 9 digits.
const PHONE_RE = /^\+998\d{9}$/

export default function RegisterPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('+998')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!firstName.trim()) next.firstName = 'First name is required.'
    if (!lastName.trim()) next.lastName = 'Last name is required.'
    if (!email.trim()) next.email = 'Email is required.'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.'
    const cleanPhone = phone.replace(/\s/g, '')
    if (!cleanPhone || cleanPhone === '+998') next.phone = 'Phone number is required.'
    else if (!PHONE_RE.test(cleanPhone)) next.phone = 'Use the format +998 followed by 9 digits.'
    if (!password) next.password = 'Password is required.'
    else if (password.length < 8) next.password = 'Use at least 8 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** Keep the +998 prefix and allow only digits after it. */
  function onPhoneChange(value: string) {
    let v = value.replace(/[^\d+]/g, '')
    if (!v.startsWith('+998')) {
      const digits = v.replace(/\D/g, '').replace(/^998/, '')
      v = '+998' + digits
    }
    // +998 + up to 9 digits = 13 chars max
    setPhone(v.slice(0, 13))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return

    setLoading(true)
    const normalizedEmail = email.trim().toLowerCase()
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phone: phone.replace(/\s/g, ''),
          password,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as RegisterResponse

      if (!res.ok) {
        setFormError(data.error ?? 'We could not create your account. Please try again.')
        return
      }

      // Account created (unverified) — go enter the emailed 6-digit code.
      const target = data.email ?? normalizedEmail
      router.push(`/verify?email=${encodeURIComponent(target)}`)
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
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-navy-500">
          Start practicing IELTS, CEFR and Multilevel tests today.
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            type="text"
            name="firstName"
            autoComplete="given-name"
            placeholder="Ali"
            value={firstName}
            error={errors.firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
            required
          />
          <Input
            label="Last name"
            type="text"
            name="lastName"
            autoComplete="family-name"
            placeholder="Karimov"
            value={lastName}
            error={errors.lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

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
          label="Phone"
          type="tel"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          value={phone}
          error={errors.phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          disabled={loading}
          required
        />

        <Input
          label="Password"
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

        <div className="rounded-xl bg-sky-50 px-3.5 py-3 text-xs leading-relaxed text-navy-600">
          We&apos;ll email a <span className="font-semibold text-navy-700">6-digit code</span> to
          confirm your address. Your phone is saved for your account but isn&apos;t verified by SMS.
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-navy-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-navy-700 underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
