'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { cn } from '@/lib/cn'

interface NavItem {
  label: string
  href: string
}

const NAV: NavItem[] = [
  { label: 'IELTS', href: '/practice#track-ielts' },
  { label: 'SAT', href: '/practice#track-sat' },
  { label: 'General English', href: '/practice#track-general_english' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Seminars', href: '/seminars' },
]

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the mobile menu whenever the route changes — adjust state during
  // render (the React-recommended pattern) instead of in an effect.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (open) setOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/30 bg-white/60 shadow-sm backdrop-blur-xl">
      <nav className="container-app flex h-16 items-center justify-between" aria-label="Main">
        <Link href="/" className="flex items-center rounded-lg" aria-label="Savynt home">
          <Logo size={48} />
        </Link>

        {/* desktop */}
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(pathname, item.href)
                    ? 'text-navy-800'
                    : 'text-navy-500 hover:text-navy-800',
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <Button href="/login" variant="ghost" size="sm">
            Login
          </Button>
          <Button href="/register" variant="primary" size="sm">
            Get started
          </Button>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* mobile */}
      {open && (
        <div className="border-t border-navy-100 bg-sky-50 lg:hidden">
          <ul className="container-app space-y-1 py-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className={cn(
                    'block rounded-lg px-3 py-2.5 font-medium',
                    isActive(pathname, item.href)
                      ? 'bg-navy-50 text-navy-800'
                      : 'text-navy-600 hover:bg-navy-50',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="flex flex-col gap-2 pt-2">
              <LanguageSwitcher className="justify-center" />
              <Button href="/login" variant="secondary" className="w-full" onClick={() => setOpen(false)}>
                Login
              </Button>
              <Button href="/register" className="w-full" onClick={() => setOpen(false)}>
                Get started
              </Button>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}

export default Navbar
