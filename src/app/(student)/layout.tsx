'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Library,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/cn'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/practice', label: 'Practice', icon: Library },
]

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menus whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [pathname])

  // Close the user dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Even if the network call fails, send the user to login.
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col bg-sky-50">
      <header className="sticky top-0 z-40 border-b border-navy-100 bg-sky-50/85 backdrop-blur-md">
        <nav className="container-app flex h-16 items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center" aria-label="Savynt home">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-white text-navy-800 shadow-card'
                        : 'text-navy-500 hover:text-navy-800',
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-2">
            {/* User menu (desktop) */}
            <div ref={menuRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-navy-700 transition-colors hover:border-navy-300 hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-navy-700">
                  <User className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="hidden lg:inline">Account</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-navy-400 transition-transform',
                    menuOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-navy-100 bg-white p-1.5 shadow-card-hover"
                >
                  <Link
                    href="/pricing"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
                  >
                    <CreditCard className="h-4 w-4 text-navy-400" aria-hidden="true" />
                    Subscription
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4 text-navy-400" aria-hidden="true" />
                    {loggingOut ? 'Signing out…' : 'Log out'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="rounded-lg p-2 text-navy-700 transition-colors hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 sm:hidden"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="border-t border-navy-100 bg-sky-50 sm:hidden">
            <ul className="container-app space-y-1 py-3">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                        active ? 'bg-white text-navy-800 shadow-card' : 'text-navy-600',
                      )}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
              <li className="!mt-2 border-t border-navy-100 pt-2">
                <Link
                  href="/pricing"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-600"
                >
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Subscription
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-navy-600 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {loggingOut ? 'Signing out…' : 'Log out'}
                </button>
              </li>
            </ul>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
