import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Upload,
  ClipboardCheck,
  Users,
  ShieldCheck,
  ArrowLeft,
  PenSquare,
} from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Logo } from '@/components/Logo'
import { Badge } from '@/components/ui/Badge'

export const metadata = {
  title: 'Coach',
}

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  desc: string
}

const NAV: NavItem[] = [
  {
    href: '/coach',
    label: 'Overview',
    icon: LayoutDashboard,
    desc: 'Students, tasks & reviews',
  },
  {
    href: '/coach/tasks/new',
    label: 'Build test',
    icon: PenSquare,
    desc: 'Write questions by hand',
  },
  {
    href: '/coach/upload',
    label: 'Upload test',
    icon: Upload,
    desc: 'Import HTML (legacy)',
  },
  {
    href: '/coach/review',
    label: 'Grading queue',
    icon: ClipboardCheck,
    desc: 'Writing & speaking feedback',
  },
  {
    href: '/coach/students',
    label: 'My students',
    icon: Users,
    desc: 'Progress of assigned learners',
  },
]

export default async function CoachLayout({ children }: { children: ReactNode }) {
  const session = await requireRole('OWNER', 'ADMIN', 'COACH')

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { firstName: true, lastName: true, email: true, role: true },
  })

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Coach'
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() ||
    (user?.email?.[0]?.toUpperCase() ?? 'C')

  return (
    <div className="min-h-screen bg-sky-50">
      {/* Top bar (all breakpoints) */}
      <header className="sticky top-0 z-40 border-b border-navy-100 bg-sky-50/90 backdrop-blur-md">
        <div className="container-app flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/coach" className="flex items-center" aria-label="SVY coach home">
              <Logo />
            </Link>
            <span className="hidden sm:inline-flex">
              <Badge tone="navy">Coach panel</Badge>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-navy-800">{fullName}</p>
              <p className="text-xs capitalize text-navy-400">{user?.role?.toLowerCase()}</p>
            </div>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white"
              aria-hidden="true"
            >
              {initials}
            </span>
          </div>
        </div>
      </header>

      <div className="container-app flex flex-col gap-8 py-8 lg:flex-row lg:py-10">
        {/* Sidebar */}
        <aside className="lg:w-64 lg:shrink-0">
          <nav aria-label="Coach navigation">
            {/* Mobile: horizontal scroll tabs. Desktop: vertical cards. */}
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1.5 lg:px-0 lg:pb-0">
              {NAV.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href} className="shrink-0 lg:shrink">
                    <Link
                      href={item.href}
                      className="group flex items-center gap-3 rounded-xl border border-transparent bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-600 shadow-card transition-colors hover:border-navy-200 hover:text-navy-800 lg:bg-transparent lg:shadow-none lg:hover:bg-white"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-navy-700 transition-colors group-hover:bg-sky-200">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{item.label}</span>
                        <span className="hidden truncate text-xs font-normal text-navy-400 lg:block">
                          {item.desc}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="mt-6 hidden rounded-2xl border border-navy-100 bg-white p-4 shadow-card lg:block">
            <div className="flex items-center gap-2 text-navy-700">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Moderation</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-navy-500">
              Tests you upload are reviewed by an admin before they go live. You can grade your own
              students&apos; writing and speaking at any time.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="mt-4 hidden items-center gap-1.5 px-1 text-xs font-semibold text-navy-400 transition-colors hover:text-navy-700 lg:inline-flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to learning
          </Link>
        </aside>

        {/* Page content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
