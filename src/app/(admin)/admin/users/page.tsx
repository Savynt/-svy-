import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, UserX, ShieldCheck, MoreHorizontal, Mail, Phone } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { requireRole } from '@/lib/auth/session'
import type { Role } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Users',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 20

const ROLE_TONE: Record<Role, 'navy' | 'sky' | 'accent' | 'green' | 'gray'> = {
  OWNER: 'accent',
  ADMIN: 'navy',
  COACH: 'sky',
  DEVELOPER: 'gray',
  STUDENT: 'green',
}

const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  COACH: 'Coach',
  DEVELOPER: 'Developer',
  STUDENT: 'Student',
}

const ROLE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'COACH', label: 'Coaches' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'OWNER', label: 'Owners' },
]

function isRole(value: string): value is Role {
  return ['OWNER', 'ADMIN', 'COACH', 'DEVELOPER', 'STUDENT'].includes(value)
}

function fullName(u: { firstName: string | null; lastName: string | null; name: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || '—'
}

function initialsOf(u: {
  firstName: string | null
  lastName: string | null
  email: string
}): string {
  const a = u.firstName?.[0] ?? u.email[0] ?? '?'
  const b = u.lastName?.[0] ?? ''
  return (a + b).toUpperCase()
}

export default async function AdminUsersPage({
  searchParams,
}: {
  // Next.js 16 — searchParams is a Promise, await it.
  searchParams: Promise<{ q?: string; role?: string; page?: string }>
}) {
  await requireRole('OWNER', 'ADMIN', 'DEVELOPER')

  const params = await searchParams
  const q = (params.q ?? '').trim()
  const roleFilter = params.role && isRole(params.role) ? params.role : ''
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

  const where: Prisma.UserWhereInput = {
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        lastActiveAt: true,
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, total)

  const buildHref = (overrides: Record<string, string | number>) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (roleFilter) sp.set('role', roleFilter)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === '' || v === 0) sp.delete(k)
      else sp.set(k, String(v))
    }
    const s = sp.toString()
    return s ? `/admin/users?${s}` : '/admin/users'
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">People</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
          Users
        </h1>
        <p className="mt-2 text-navy-500">
          {total.toLocaleString('en-US')} {total === 1 ? 'account' : 'accounts'} matching your view.
        </p>
      </div>

      {/* Search + filters */}
      <Card>
        <CardBody className="space-y-4">
          {/* GET form — submitting updates ?q= and is server-readable */}
          <form action="/admin/users" method="get" className="flex flex-col gap-3 sm:flex-row">
            {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search by name, email or phone…"
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
                aria-label="Search users"
                className="w-full rounded-xl border border-navy-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy-800 placeholder:text-navy-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
              />
            </div>
            <Button type="submit" variant="primary" size="md" className="shrink-0">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((f) => {
              const active = roleFilter === f.value
              const sp = new URLSearchParams()
              if (q) sp.set('q', q)
              if (f.value) sp.set('role', f.value)
              const href = sp.toString() ? `/admin/users?${sp.toString()}` : '/admin/users'
              return (
                <Link
                  key={f.label}
                  href={href}
                  aria-current={active ? 'true' : undefined}
                  className={
                    active
                      ? 'rounded-full bg-navy-700 px-3.5 py-1.5 text-sm font-semibold text-white'
                      : 'rounded-full border border-navy-100 bg-white px-3.5 py-1.5 text-sm font-medium text-navy-600 transition-colors hover:border-navy-200 hover:text-navy-800'
                  }
                >
                  {f.label}
                </Link>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {users.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-navy-500">
              <UserX className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-4 font-display text-lg font-bold text-navy-800">No users found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-navy-500">
              {q || roleFilter
                ? 'Try a different search term or clear the filters.'
                : 'New sign-ups will appear here as learners register.'}
            </p>
            {(q || roleFilter) && (
              <div className="mt-4">
                <Button href="/admin/users" variant="secondary" size="sm">
                  Clear filters
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 bg-sky-50 text-xs font-semibold uppercase tracking-wider text-navy-400">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-sky-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                          {initialsOf(u)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-navy-800">{fullName(u)}</p>
                          <p className="truncate text-xs text-navy-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden="true" />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-navy-500">
                      {u.createdAt.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        {/* Actions are placeholders until the user-management endpoints land. */}
                        <button
                          type="button"
                          disabled
                          title="User actions (coming soon)"
                          aria-label={`Actions for ${fullName(u)}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50 disabled:opacity-50"
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {users.map((u) => (
              <Card key={u.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700">
                      {initialsOf(u)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-navy-800">{fullName(u)}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-navy-400">
                        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {u.email}
                      </p>
                      {u.phone && (
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-navy-400">
                          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {u.phone}
                        </p>
                      )}
                    </div>
                    <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </div>
                  <div className="flex items-center justify-between border-t border-navy-50 pt-3 text-xs">
                    {u.emailVerified ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Verified
                      </span>
                    ) : (
                      <span className="font-semibold text-navy-400">Unverified</span>
                    )}
                    <span className="text-navy-400">
                      Joined{' '}
                      {u.createdAt.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-navy-500">
              Showing <span className="font-semibold text-navy-700">{showingFrom}</span>–
              <span className="font-semibold text-navy-700">{showingTo}</span> of{' '}
              <span className="font-semibold text-navy-700">{total.toLocaleString('en-US')}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Button href={buildHref({ page: page - 1 })} variant="secondary" size="sm">
                    Previous
                  </Button>
                ) : (
                  <span className="cursor-not-allowed rounded-xl border border-navy-100 px-3.5 py-2 text-sm font-medium text-navy-300">
                    Previous
                  </span>
                )}
                <span className="text-sm text-navy-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Button href={buildHref({ page: page + 1 })} variant="secondary" size="sm">
                    Next
                  </Button>
                ) : (
                  <span className="cursor-not-allowed rounded-xl border border-navy-100 px-3.5 py-2 text-sm font-medium text-navy-300">
                    Next
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
