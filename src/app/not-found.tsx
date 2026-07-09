import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'

const SUGGESTIONS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/seminars', label: 'Free seminars' },
  { href: '/about', label: 'About Savynt' },
  { href: '/register', label: 'Create an account' },
] as const

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-sky-50">
      <header className="border-b border-navy-100 bg-sky-50/85 backdrop-blur-md">
        <div className="container-app flex h-16 items-center">
          <Link href="/" aria-label="Savynt home" className="flex items-center">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="container-app flex flex-1 flex-col items-center justify-center py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-navy-700">
          <Compass aria-hidden="true" className="h-7 w-7" />
        </span>
        <p className="mt-6 font-display text-6xl font-extrabold tracking-tight text-navy-200">404</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
          We couldn’t find that page
        </h1>
        <p className="mt-3 max-w-md text-navy-500">
          The page you’re looking for doesn’t exist or may have moved. Let’s get you back on track.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button href="/" variant="primary" size="lg">
            Back to home
          </Button>
          <Button href="/pricing" variant="secondary" size="lg">
            See pricing
          </Button>
        </div>

        <nav aria-label="Popular pages" className="mt-10 w-full max-w-md">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
            Popular pages
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm font-semibold text-navy-700 transition-colors hover:border-navy-200 hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2"
                >
                  {item.label}
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 text-navy-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-500"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  )
}
