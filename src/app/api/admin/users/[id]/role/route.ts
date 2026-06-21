import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ROLES, type Role } from '@/lib/rbac'
import { z } from 'zod'

const bodySchema = z.object({
  role: z.enum([...ROLES] as [Role, ...Role[]]),
})

// Singleton roles — only one user may hold these at any time.
const SINGLETON_ROLES: Role[] = ['OWNER', 'DEVELOPER']

/**
 * PATCH /api/admin/users/[id]/role
 * Assign a role to a user. Only OWNER may call this endpoint.
 * OWNER and DEVELOPER are singletons — a 409 is returned if one already exists.
 * OWNER cannot re-assign their own role (prevents accidental lock-out).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession()
  if (!session) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'OWNER') return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const { id: targetId } = await params

  // OWNER cannot change their own role.
  if (session.id === targetId) {
    return Response.json({ ok: false, error: 'Cannot change your own role' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { role } = parsed.data

  // Singleton check inside a transaction to guard against races.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (SINGLETON_ROLES.includes(role)) {
        const existing = await tx.user.count({ where: { role } })
        if (existing > 0) {
          throw new Error(`SINGLETON:${role}`)
        }
      }

      return tx.user.update({
        where: { id: targetId },
        data: { role },
        select: { id: true, email: true, role: true },
      })
    })

    return Response.json({ ok: true, user: updated })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('SINGLETON:')) {
      const role = error.message.split(':')[1]
      return Response.json(
        { ok: false, error: `Role ${role} is already assigned to another user` },
        { status: 409 },
      )
    }
    // P2025 — target user not found
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return Response.json({ ok: false, error: 'User not found' }, { status: 404 })
    }
    throw error
  }
}
