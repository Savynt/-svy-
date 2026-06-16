import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/session'
import { can } from '@/lib/rbac'
import { TestBuilder } from '@/components/builder/TestBuilder'

export const metadata: Metadata = {
  title: 'Build a test',
  robots: { index: false, follow: false },
}

/**
 * Manual Test Builder page — the primary authoring path now that HTML import is
 * deprecated. Coaches submit for review; OWNER/ADMIN can publish straight away.
 */
export default async function NewTaskPage() {
  const session = await requireRole('OWNER', 'ADMIN', 'COACH')
  // OWNER/ADMIN may publish directly; a coach's tasks always go to moderation.
  const canPublish = can(session.role, 'task:publish')

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Build a test</h1>
        <p className="mt-1 text-sm text-navy-500">
          Write questions by hand — add options and mark the correct answer. Works for reading,
          listening, writing and speaking.
        </p>
      </header>
      <TestBuilder canPublish={canPublish} />
    </div>
  )
}
