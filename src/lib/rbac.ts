/**
 * Role-based access control.
 * Roles mirror the Prisma `Role` enum. Keep this file framework-agnostic
 * (no next/server imports) so it can be used on client and server.
 */

export const ROLES = ['OWNER', 'ADMIN', 'COACH', 'DEVELOPER', 'STUDENT'] as const
export type Role = (typeof ROLES)[number]

export type Permission =
  | 'content:view' // consume tasks/lessons
  | 'task:create' // author a task (coach -> needs moderation)
  | 'task:publish' // publish/approve tasks (no moderation needed)
  | 'task:moderate' // approve/reject coach submissions
  | 'task:import' // bulk import from HTML/JSON
  | 'student:view-own' // a coach sees their assigned students
  | 'student:view-all' // see every learner
  | 'user:manage' // create/disable users, assign roles
  | 'pricing:manage' // edit plans, prices, promo codes (OWNER only)
  | 'billing:view' // see revenue/subscriptions
  | 'analytics:view' // platform analytics
  | 'seminar:manage' // create/schedule seminars
  | 'system:admin' // deploy, feature flags, migrations

const MATRIX: Record<Role, Permission[]> = {
  OWNER: [
    'content:view', 'task:create', 'task:publish', 'task:moderate', 'task:import',
    'student:view-all', 'user:manage', 'pricing:manage', 'billing:view',
    'analytics:view', 'seminar:manage', 'system:admin',
  ],
  ADMIN: [
    'content:view', 'task:create', 'task:publish', 'task:moderate', 'task:import',
    'student:view-all', 'user:manage', 'analytics:view', 'seminar:manage',
    // NOTE: no pricing:manage, no billing:view — money stays with OWNER
  ],
  COACH: [
    'content:view', 'task:create', 'student:view-own', 'seminar:manage',
    // coach-created tasks require moderation (no task:publish)
  ],
  DEVELOPER: [
    'content:view', 'task:import', 'system:admin',
    // technical access; ideally no personal data, no pricing
  ],
  STUDENT: ['content:view'],
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return MATRIX[role]?.includes(permission) ?? false
}

/** Which app zone a role lands in after login. */
export function homeForRole(role: Role): string {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return '/admin'
    case 'COACH':
      return '/coach'
    case 'DEVELOPER':
      return '/admin'
    case 'STUDENT':
    default:
      return '/dashboard'
  }
}

/** Roles allowed to enter a guarded path prefix. Used by proxy.ts. */
export const ZONE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: '/admin', roles: ['OWNER', 'ADMIN', 'DEVELOPER'] },
  { prefix: '/coach', roles: ['OWNER', 'ADMIN', 'COACH'] },
  { prefix: '/dashboard', roles: ['OWNER', 'ADMIN', 'COACH', 'DEVELOPER', 'STUDENT'] },
  { prefix: '/practice', roles: ['OWNER', 'ADMIN', 'COACH', 'DEVELOPER', 'STUDENT'] },
]
