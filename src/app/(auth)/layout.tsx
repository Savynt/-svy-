import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Account',
  description:
    'Sign in or create your SVY account to practice IELTS, CEFR and Multilevel exams with real exam-style tests and instant scoring.',
  robots: { index: false, follow: true },
}

/**
 * Auth shell — a centered card on a soft sky background, used by every page in
 * the (auth) route group (login, register, verify, forgot/reset password).
 * Brand mark sits above the card; a short trust line sits below it.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-sky-50 px-5 py-10 sm:px-6">
      {/* Decorative brand glow — subtle, never competes with the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-sky-100 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-accent-400/10 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <Link
          href="/"
          aria-label="SVY home"
          className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50"
        >
          <Logo size={44} variant="navy" />
        </Link>

        <div className="mt-6 w-full animate-fade-up rounded-2xl border border-navy-100 bg-white p-6 shadow-card sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-navy-500">
          IELTS · CEFR · Multilevel preparation, built for Uzbekistan.
        </p>
      </div>
    </main>
  )
}
