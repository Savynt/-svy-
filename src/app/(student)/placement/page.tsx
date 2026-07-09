import type { Metadata } from 'next'
import { Compass, Gauge, Clock, Sparkles, ShieldCheck, ListChecks } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { PlacementRunner } from '@/components/placement/PlacementRunner'
import { plannedQuestionCount, levelLabel } from '@/lib/placement'

export const metadata: Metadata = {
  title: 'Placement test',
  description:
    'Take the Savynt placement test to find your English level (A1–C2) and a rough IELTS band, then get a personalised study path.',
}

interface Highlight {
  icon: typeof Gauge
  title: string
  body: string
}

const HIGHLIGHTS: Highlight[] = [
  {
    icon: Gauge,
    title: 'It adapts to you',
    body: 'Questions get harder when you’re right and easier when you’re not, so we zero in on your level fast.',
  },
  {
    icon: Clock,
    title: 'About 5 minutes',
    body: 'A short set of grammar, vocabulary and reading questions — one at a time, no time pressure.',
  },
  {
    icon: Sparkles,
    title: 'A clear next step',
    body: 'You’ll get your level assessment and a rough IELTS band — plus exactly what to study next.',
  },
]

export default async function PlacementPage() {
  // Auth gate — `(student)` is behind the proxy guard, but fetch the user so we
  // can greet returning learners and show their current level.
  const user = await getCurrentUser()
  const total = plannedQuestionCount()
  const currentLevel = user?.cefrLevel ?? null
  const firstName = user?.firstName?.trim() || null

  return (
    <div>
      {/* Hero band */}
      <section className="border-b border-navy-100 bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600 text-white">
        <div className="container-app py-12 sm:py-16">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="accent">Placement test</Badge>
            {currentLevel && <Badge tone="sky">Current level: {currentLevel}</Badge>}
          </div>
          <h1 className="max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {firstName ? `${firstName}, let’s find your English level` : 'Find your English level'}
          </h1>
          <p className="mt-3 max-w-2xl text-sky-100 sm:text-lg">
            This quick adaptive test sets your level (A1–C2) and a rough IELTS band, so every test
            and lesson we recommend is pitched just right for you.
          </p>
        </div>
      </section>

      <div className="container-app py-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_minmax(0,1fr)]">
          {/* Left: the runner */}
          <div className="order-2 lg:order-1">
            <PlacementRunner />
          </div>

          {/* Right: what to expect */}
          <aside className="order-1 space-y-6 lg:order-2">
            <SectionHeading
              eyebrow="What to expect"
              title="A smart way to start"
              subtitle="No grades, no pressure — just an honest read on where you are today."
            />

            <div className="space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
                <Card key={title}>
                  <CardBody className="flex items-start gap-3.5 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-800">{title}</p>
                      <p className="mt-0.5 text-sm text-navy-500">{body}</p>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            <Card className="bg-sky-50">
              <CardBody className="space-y-3 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-navy-400">
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  How it works
                </p>
                <ul className="space-y-2 text-sm text-navy-600">
                  <li className="flex items-start gap-2">
                    <Compass className="mt-0.5 h-4 w-4 shrink-0 text-navy-400" aria-hidden="true" />
                    <span>
                      You’ll answer up to <span className="font-semibold text-navy-700">{total}</span>{' '}
                      multiple-choice questions, one at a time.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-navy-400" aria-hidden="true" />
                    <span>Difficulty rises and falls with your answers to pinpoint your level.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-navy-400" aria-hidden="true" />
                    <span>Your result is saved to your profile and used to tailor recommendations.</span>
                  </li>
                </ul>
                {currentLevel && (
                  <p className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs text-navy-500">
                    You’re currently set to{' '}
                    <span className="font-semibold text-navy-700">{levelLabel(currentLevel)}</span>.
                    Retaking the test will update it.
                  </p>
                )}
              </CardBody>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
