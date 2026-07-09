import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Tags,
  BarChart3,
  CircleDollarSign,
  ExternalLink,
  FileText,
  PenSquare,
} from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { can } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Logo } from '@/components/Logo'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Savynt platform administration — users, content, pricing and analytics.',
  robots: { index: false, follow: false },
}

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  /** when set, the item is only shown to roles holding this permission */
  ownerOnly?: boolean
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/coach/tasks/new', label: 'Build test', icon: PenSquare },
  { href: '/admin/content', label: 'Tasks', icon: FileText },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/pricing', label: 'Pricing', icon: Tags, ownerOnly: true },
]

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  DEVELOPER: 'Developer',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Guard: only platform staff may enter. requireRole redirects otherwise.
  const session = await requireRole('OWNER', 'ADMIN', 'DEVELOPER')
  const canBilling = can(session.role, 'billing:view')

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { firstName: true, lastName: true, email: true },
  })

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Signed in'
  const initials =
    (user?.firstName?.[0] ?? user?.email?.[0] ?? 'S').toUpperCase() +
    (user?.lastName?.[0] ?? '').toUpperCase()

  const visibleNav = NAV.filter((item) => !item.ownerOnly || canBilling)

  return (
    <div className="min-h-screen bg-sky-50">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col lg:flex-row">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 border-r border-navy-100 bg-white lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:self-start">
          <div className="flex h-16 items-center border-b border-navy-100 px-5">
            <Link href="/admin" className="flex items-center" aria-label="Savynt admin home">
              <Logo />
            </Link>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
                {item.ownerOnly && (
                  <CircleDollarSign className="ml-auto h-3.5 w-3.5 text-accent-500" aria-hidden="true" />
                )}
              </Link>
            ))}
          </nav>

          <div className="border-t border-navy-100 p-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-800"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Back to app
            </Link>
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-sky-50 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy-800">{displayName}</p>
                <p className="truncate text-xs text-navy-400">
                  {ROLE_LABEL[session.role] ?? session.role}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar (mobile + desktop context) */}
          <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/90 backdrop-blur-md">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <Link href="/admin" className="flex items-center lg:hidden" aria-label="Savynt admin home">
                <Logo />
              </Link>
              <Badge tone="navy" className="hidden sm:inline-flex">
                Admin console
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                <Badge tone={session.role === 'OWNER' ? 'accent' : 'sky'}>
                  {ROLE_LABEL[session.role] ?? session.role}
                </Badge>
              </div>
            </div>

            {/* Mobile nav: horizontally scrollable pills */}
            <nav
              className="flex gap-1.5 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden"
              aria-label="Admin sections"
            >
              {visibleNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border border-navy-100 bg-white px-3.5 py-1.5 text-sm font-medium text-navy-600',
                    'transition-colors hover:border-navy-200 hover:text-navy-800',
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
