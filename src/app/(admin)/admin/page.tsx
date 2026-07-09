import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Users,
  BadgeCheck,
  CircleDollarSign,
  FileText,
  ClipboardList,
  GraduationCap,
  ArrowRight,
  Lock,
} from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { can } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { formatUzs } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Overview',
  robots: { index: false, follow: false },
}

interface Stat {
  label: string
  value: string
  hint: string
  icon: typeof Users
  href?: string
}

export default async function AdminOverviewPage() {
  const session = await requireRole('OWNER', 'ADMIN', 'DEVELOPER')
  const canBilling = can(session.role, 'billing:view')

  // One round-trip of counts. Revenue queries are only issued for OWNER.
  const [users, students, coaches, activeSubs, publishedTasks, pendingTasks, seminars] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'COACH' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.task.count({ where: { status: 'PUBLISHED' } }),
      prisma.task.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.seminar.count(),
    ])

  // Monthly recurring revenue, approximated from active subs' grandfathered price.
  const revenue = canBilling
    ? await prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { priceUzsAtPurchase: true },
      })
    : null
  const mrr = revenue?._sum.priceUzsAtPurchase ?? 0

  const peopleStats: Stat[] = [
    {
      label: 'Total users',
      value: users.toLocaleString('en-US'),
      hint: `${students.toLocaleString('en-US')} students · ${coaches.toLocaleString('en-US')} coaches`,
      icon: Users,
      href: '/admin/users',
    },
    {
      label: 'Active subscriptions',
      value: activeSubs.toLocaleString('en-US'),
      hint: 'Currently paying learners',
      icon: BadgeCheck,
    },
  ]

  const contentStats: Stat[] = [
    {
      label: 'Published tasks',
      value: publishedTasks.toLocaleString('en-US'),
      hint: 'Live practice & mock content',
      icon: FileText,
    },
    {
      label: 'Awaiting review',
      value: pendingTasks.toLocaleString('en-US'),
      hint: 'Coach submissions in the queue',
      icon: ClipboardList,
      href: '/admin/content',
    },
    {
      label: 'Seminars',
      value: seminars.toLocaleString('en-US'),
      hint: 'Scheduled & past sessions',
      icon: GraduationCap,
    },
  ]

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">Overview</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
            Platform at a glance
          </h1>
          <p className="mt-2 max-w-xl text-navy-500">
            A live snapshot of people, revenue and content across Savynt.
          </p>
        </div>
        {pendingTasks > 0 && (
          <Button href="/admin/content" variant="secondary" size="sm">
            Review {pendingTasks} pending
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* People + revenue */}
      <section>
        <SectionHeading eyebrow="People & revenue" title="Audience" className="mb-5" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {peopleStats.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}

          {/* Revenue is OWNER-only. ADMIN sees a locked placeholder instead. */}
          {canBilling ? (
            <StatTile
              stat={{
                label: 'Monthly revenue',
                value: formatUzs(mrr),
                hint: 'Sum of active subscription prices',
                icon: CircleDollarSign,
                href: '/admin/pricing',
              }}
              accent
            />
          ) : (
            <Card className="h-full border-dashed">
              <CardBody className="flex h-full flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-400">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display text-base font-bold text-navy-700">Revenue</p>
                  <p className="mt-1 text-sm text-navy-400">
                    Billing figures are visible to the owner only.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </section>

      {/* Content */}
      <section>
        <SectionHeading eyebrow="Content" title="Library health" className="mb-5" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contentStats.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <SectionHeading eyebrow="Jump in" title="Quick actions" className="mb-5" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/admin/users"
            title="Manage users"
            blurb="Search learners and staff, review roles and account status."
            icon={Users}
          />
          <QuickAction
            href="/admin/content"
            title="Moderate content"
            blurb="Approve or reject tasks submitted by coaches for publishing."
            icon={ClipboardList}
            badge={pendingTasks > 0 ? `${pendingTasks} pending` : undefined}
          />
          {canBilling && (
            <QuickAction
              href="/admin/pricing"
              title="Pricing & promos"
              blurb="Adjust plan prices and manage promotional codes."
              icon={CircleDollarSign}
            />
          )}
        </div>
      </section>
    </div>
  )
}

function StatTile({ stat, accent = false }: { stat: Stat; accent?: boolean }) {
  const body = (
    <CardBody className="flex h-full flex-col gap-3">
      <div
        className={
          accent
            ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-accent-400/20 text-accent-600'
            : 'flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-navy-700'
        }
      >
        <stat.icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="font-display text-2xl font-extrabold text-navy-800 sm:text-3xl">{stat.value}</p>
        <p className="mt-0.5 text-sm font-semibold text-navy-600">{stat.label}</p>
        <p className="mt-1 text-xs text-navy-400">{stat.hint}</p>
      </div>
    </CardBody>
  )

  return stat.href ? (
    <Card href={stat.href} hover className="h-full">
      {body}
    </Card>
  ) : (
    <Card className="h-full">{body}</Card>
  )
}

function QuickAction({
  href,
  title,
  blurb,
  icon: Icon,
  badge,
}: {
  href: string
  title: string
  blurb: string
  icon: typeof Users
  badge?: string
}) {
  return (
    <Card href={href} hover className="group h-full">
      <CardBody className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-navy-700 transition-colors group-hover:bg-sky-200">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          {badge && <Badge tone="accent">{badge}</Badge>}
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-navy-800">{title}</h3>
        <p className="mt-1 flex-1 text-sm text-navy-500">{blurb}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700">
          Open
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </CardBody>
    </Card>
  )
}
