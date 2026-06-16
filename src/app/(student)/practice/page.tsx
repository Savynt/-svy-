import type { Metadata } from 'next'
import {
  Headphones,
  BookOpen,
  Mic,
  PenLine,
  Compass,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TaskRow } from '@/components/student/TaskRow'

export const metadata: Metadata = {
  title: 'Practice',
  description:
    'Browse the SVY practice library — IELTS, CEFR and Multilevel tests across Listening, Reading, Speaking and Writing.',
}

type Track = 'IELTS' | 'CEFR' | 'MULTILEVEL' | 'SAT'
type Skill = 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING'

const TRACKS: { track: Track; title: string; blurb: string }[] = [
  { track: 'IELTS', title: 'IELTS', blurb: 'Full exam-style sections scored to the 9-band scale.' },
  { track: 'CEFR', title: 'CEFR', blurb: 'Level-mapped practice from A1 right through to C2.' },
  {
    track: 'MULTILEVEL',
    title: 'Multilevel',
    blurb: 'The national multilevel format, mirrored end to end.',
  },
]

const SKILLS: { skill: Skill; label: string; icon: LucideIcon }[] = [
  { skill: 'LISTENING', label: 'Listening', icon: Headphones },
  { skill: 'READING', label: 'Reading', icon: BookOpen },
  { skill: 'SPEAKING', label: 'Speaking', icon: Mic },
  { skill: 'WRITING', label: 'Writing', icon: PenLine },
]

function levelLabel(cefrLevel: string | null, min: number | null, max: number | null): string | null {
  if (cefrLevel) return cefrLevel
  if (min != null && max != null) return `Band ${min}–${max}`
  if (min != null) return `Band ${min}+`
  return null
}

function trackSlug(track: Track): string {
  return track.toLowerCase()
}

export default async function PracticePage() {
  // Auth gate — opts the route into dynamic rendering.
  await requireUser()

  // groupBy gives accurate per track+skill counts in one query; the task list
  // is fetched once (bounded) and grouped in memory to avoid N+1.
  const [counts, tasks] = await Promise.all([
    prisma.task.groupBy({
      by: ['track', 'skill'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
    }),
    prisma.task.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ track: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 60,
      select: {
        id: true,
        title: true,
        track: true,
        skill: true,
        cefrLevel: true,
        ieltsBandMin: true,
        ieltsBandMax: true,
        durationMin: true,
        _count: { select: { questions: true } },
      },
    }),
  ])

  const totalPublished = counts.reduce((sum, c) => sum + c._count._all, 0)

  // Quick lookup: "TRACK|SKILL" -> count.
  const countMap = new Map<string, number>()
  for (const c of counts) {
    countMap.set(`${c.track}|${c.skill}`, c._count._all)
  }
  const countFor = (track: Track, skill: Skill): number => countMap.get(`${track}|${skill}`) ?? 0
  const countForTrack = (track: Track): number =>
    SKILLS.reduce((sum, s) => sum + countFor(track, s.skill), 0)

  // Group the fetched tasks by track, preserving order.
  const tasksByTrack = new Map<Track, typeof tasks>()
  for (const t of tasks) {
    const list = tasksByTrack.get(t.track) ?? []
    list.push(t)
    tasksByTrack.set(t.track, list)
  }

  return (
    <div>
      {/* Hero band */}
      <section className="border-b border-navy-100 bg-gradient-to-br from-white via-sky-50 to-sky-100">
        <div className="container-app py-10 sm:py-12">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
            Practice library
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">
            Choose what to practice
          </h1>
          <p className="mt-3 max-w-2xl text-navy-500 sm:text-lg">
            Real exam-style tests across every track and skill, with instant scoring and saved
            progress. Pick a track below, or jump straight into a test.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {TRACKS.map((t) => (
              <a
                key={t.track}
                href={`#track-${trackSlug(t.track)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy-700 transition-colors hover:border-navy-300 hover:bg-navy-50"
              >
                {t.title}
                <Badge tone="sky">{countForTrack(t.track)}</Badge>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="container-app py-10">
        {totalPublished === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-navy-700">
                <Compass className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-xl font-bold text-navy-800">
                  No practice tests yet
                </p>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-navy-500">
                  Our coaches are preparing IELTS, CEFR and Multilevel sets right now. Check back
                  soon — new tests are added regularly.
                </p>
              </div>
              <Button href="/dashboard" variant="secondary" size="sm">
                Back to dashboard
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-14">
            {TRACKS.map(({ track, title, blurb }) => {
              const trackTotal = countForTrack(track)
              const trackTasks = tasksByTrack.get(track) ?? []

              return (
                <section
                  key={track}
                  id={`track-${trackSlug(track)}`}
                  className="scroll-mt-20"
                >
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <SectionHeading eyebrow={`${trackTotal} published tests`} title={title} subtitle={blurb} />
                  </div>

                  {/* Skill breakdown */}
                  <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {SKILLS.map(({ skill, label, icon: Icon }) => {
                      const n = countFor(track, skill)
                      return (
                        <Card key={skill} className="h-full">
                          <CardBody className="flex items-center gap-3 p-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-navy-700">{label}</p>
                              <p className="text-xs text-navy-400">
                                {n === 0 ? 'Coming soon' : `${n} ${n === 1 ? 'test' : 'tests'}`}
                              </p>
                            </div>
                          </CardBody>
                        </Card>
                      )
                    })}
                  </div>

                  {/* Tasks in this track */}
                  {trackTasks.length > 0 ? (
                    <div className="grid gap-3">
                      {trackTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          track={task.track}
                          skill={task.skill}
                          level={levelLabel(task.cefrLevel, task.ieltsBandMin, task.ieltsBandMax)}
                          durationMin={task.durationMin}
                          questionCount={task._count.questions}
                        />
                      ))}
                      {trackTotal > trackTasks.length ? (
                        <p className="px-1 pt-1 text-sm text-navy-400">
                          Showing {trackTasks.length} of {trackTotal} {title} tests.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <Card>
                      <CardBody className="flex flex-col items-center gap-2 py-8 text-center">
                        <p className="font-display text-base font-bold text-navy-800">
                          No {title} tests published yet
                        </p>
                        <p className="mx-auto max-w-md text-sm text-navy-500">
                          New {title} practice is on the way. In the meantime, explore the other
                          tracks above.
                        </p>
                      </CardBody>
                    </Card>
                  )}
                </section>
              )
            })}

            <div className="rounded-2xl border border-navy-100 bg-white p-6 text-center shadow-card">
              <p className="font-display text-lg font-bold text-navy-800">
                Not sure where to start?
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-navy-500">
                Head back to your dashboard for personalised recommendations based on your progress.
              </p>
              <div className="mt-4">
                <Button href="/dashboard" variant="primary" size="sm">
                  Go to dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
