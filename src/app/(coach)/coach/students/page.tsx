import Link from 'next/link'
import {
  Users,
  Mail,
  BookOpenCheck,
  GraduationCap,
  Headphones,
  BookOpen,
  Mic,
  PenLine,
  type LucideIcon,
} from 'lucide-react'
import type { Skill } from '@prisma/client'
import { requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'

export const metadata = {
  title: 'My students',
}

const SKILLS: { key: Skill; label: string; icon: LucideIcon }[] = [
  { key: 'LISTENING', label: 'Listening', icon: Headphones },
  { key: 'READING', label: 'Reading', icon: BookOpen },
  { key: 'WRITING', label: 'Writing', icon: PenLine },
  { key: 'SPEAKING', label: 'Speaking', icon: Mic },
]

export default async function CoachStudentsPage() {
  const session = await requireRole('OWNER', 'ADMIN', 'COACH')
  const coachId = session.id

  const links = await prisma.coachStudent.findMany({
    where: { coachId },
    orderBy: { createdAt: 'asc' },
    select: {
      createdAt: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cefrLevel: true,
          lastActiveAt: true,
          progress: {
            select: { skill: true, avgScorePct: true, testsCompleted: true, bandEstimate: true },
          },
          _count: { select: { attempts: true } },
        },
      },
    },
  })

  const students = links.map((link) => {
    const s = link.student
    const bySkill = new Map(s.progress.map((p) => [p.skill, p]))
    const scored = s.progress.filter((p) => p.testsCompleted > 0)
    const overall =
      scored.length > 0
        ? Math.round(scored.reduce((sum, p) => sum + p.avgScorePct, 0) / scored.length)
        : 0
    const testsCompleted = s.progress.reduce((sum, p) => sum + p.testsCompleted, 0)
    const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email
    return { ...s, assignedAt: link.createdAt, bySkill, overall, testsCompleted, name }
  })

  const activeCount = students.filter((s) => s.overall > 0).length

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
            My students
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">
            Assigned learners
          </h1>
          <p className="mt-3 max-w-xl text-navy-500 sm:text-lg">
            Track each learner&apos;s progress across the four skills and jump into their pending
            work.
          </p>
        </div>
        {students.length > 0 && (
          <div className="flex gap-2">
            <Badge tone="sky" className="px-3 py-1">
              <Users className="h-3.5 w-3.5" /> {students.length} assigned
            </Badge>
            <Badge tone="green" className="px-3 py-1">
              {activeCount} active
            </Badge>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-navy-700">
              <Users className="h-7 w-7" />
            </span>
            <h2 className="font-display text-xl font-bold text-navy-800">No students yet</h2>
            <p className="max-w-md text-navy-500">
              An admin assigns learners to your group. Once linked, they&apos;ll appear here with
              live progress bars for listening, reading, writing and speaking.
            </p>
            <Button href="/coach" variant="secondary" size="sm" className="mt-1">
              Back to overview
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {students.map((student) => (
            <Card key={student.id} className="h-full">
              <CardBody className="flex h-full flex-col gap-5">
                {/* Student header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white">
                      {(student.firstName?.[0] ?? student.email[0]).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold text-navy-800">
                        {student.name}
                      </p>
                      <a
                        href={`mailto:${student.email}`}
                        className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-navy-400 hover:text-navy-700"
                      >
                        <Mail className="h-3 w-3" />
                        {student.email}
                      </a>
                    </div>
                  </div>
                  {student.cefrLevel ? (
                    <Badge tone="accent">{student.cefrLevel}</Badge>
                  ) : (
                    <Badge tone="gray">No level</Badge>
                  )}
                </div>

                {/* Overall */}
                <div className="rounded-xl bg-sky-50 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-navy-400">
                      Overall progress
                    </span>
                    <span className="font-display text-sm font-extrabold text-navy-800">
                      {student.overall}%
                    </span>
                  </div>
                  <ProgressBar value={student.overall} />
                </div>

                {/* Per-skill bars */}
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {SKILLS.map(({ key, label, icon: Icon }) => {
                    const p = student.bySkill.get(key)
                    const value = p ? Math.round(p.avgScorePct) : 0
                    return (
                      <div key={key}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700">
                            <Icon className="h-3.5 w-3.5 text-navy-400" />
                            {label}
                          </span>
                          <span className="text-xs font-semibold text-navy-400">
                            {p && p.testsCompleted > 0 ? `${value}%` : '—'}
                          </span>
                        </div>
                        <ProgressBar value={value} />
                      </div>
                    )
                  })}
                </div>

                {/* Footer stats */}
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-navy-100 pt-4 text-xs text-navy-400">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpenCheck className="h-3.5 w-3.5" />
                    {student.testsCompleted} tests completed
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {student._count.attempts} attempts
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    Assigned{' '}
                    {student.assignedAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-navy-400">
        Need a learner added to your group?{' '}
        <Link href="/coach" className="font-semibold text-navy-600 hover:text-navy-800">
          Ask an admin to assign them
        </Link>
        .
      </p>
    </div>
  )
}
