import type { Metadata } from 'next'
import type { SeminarPlatform } from '@prisma/client'
import { CalendarDays, Clock, PlayCircle, Radio, Users, Video } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { SEMINARS, type MarketingSeminar } from '@/data/marketing'
import { OG_IMAGE } from '@/lib/seo/openGraph'

export const metadata: Metadata = {
  title: 'Free live seminars',
  description:
    'Join free Savynt seminars on IELTS, SAT and General English prep — live on Google Meet and YouTube Live, with recordings afterwards. No subscription required.',
  alternates: { canonical: '/seminars' },
  openGraph: {
    ...OG_IMAGE,
    title: 'Free Savynt seminars — live on Google Meet & YouTube',
    description:
      'Free live sessions on IELTS, SAT and General English preparation. Register and get the recording afterwards.',
    url: '/seminars',
  },
}

const PLATFORM_LABEL: Record<SeminarPlatform, string> = {
  GOOGLE_MEET: 'Google Meet',
  YOUTUBE_LIVE: 'YouTube Live',
  ZOOM: 'Zoom',
  JITSI: 'Jitsi',
}

// Stable formatters so server output is deterministic regardless of host locale.
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Tashkent',
})
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Tashkent',
})

function formatWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return { date: dateFmt.format(d), time: `${timeFmt.format(d)} (Tashkent)` }
}

const HOW_IT_WORKS = [
  {
    icon: Radio,
    title: 'Live on Meet & YouTube',
    text: 'Every seminar streams on Google Meet or YouTube Live — join from a phone or laptop, no install needed.',
  },
  {
    icon: Video,
    title: 'Recordings afterwards',
    text: 'Can’t make it live? Register anyway — we post the recording so you can watch on your own time.',
  },
  {
    icon: Users,
    title: 'Always free',
    text: 'Seminars are free for everyone. You don’t need a subscription to attend or to watch the replay.',
  },
] as const

export default function SeminarsPage() {
  const upcoming = SEMINARS.filter((s) => !s.hasRecording)
  const past = SEMINARS.filter((s) => s.hasRecording)

  return (
    <div>
      <PageHero
        eyebrow="Seminars"
        title="Free live seminars"
        subtitle="Practical, exam-focused sessions on IELTS, SAT and General English preparation — streamed live on Google Meet and YouTube Live. Free for everyone, recordings included."
        breadcrumbs={[{ label: 'Seminars' }]}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-sky-100">
          <span className="rounded-lg bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-inset ring-emerald-300/30">
            Always free
          </span>
          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/20">
            Google Meet
          </span>
          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/20">
            YouTube Live
          </span>
        </div>
      </PageHero>

      <div className="container-app">
        {/* How it works */}
        <section className="py-12 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <Card key={item.title}>
                <CardBody className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                    <item.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-navy-800">{item.title}</p>
                    <p className="mt-0.5 text-sm text-navy-500">{item.text}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* Upcoming */}
        <section className="pb-4">
          <SectionHeading
            eyebrow="Upcoming"
            title="Next live sessions"
            subtitle="Register to get the joining link and a reminder before we go live."
          />

          {upcoming.length === 0 ? (
            <Card className="mt-8">
              <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-navy-700">
                  <CalendarDays aria-hidden="true" className="h-6 w-6" />
                </span>
                <p className="font-display text-base font-bold text-navy-800">
                  No live seminars scheduled right now
                </p>
                <p className="max-w-md text-sm text-navy-500">
                  New sessions are added every few weeks. Create an account and we’ll let you know as
                  soon as the next one is announced.
                </p>
                <Button href="/register" variant="primary" className="mt-1">
                  Notify me
                </Button>
              </CardBody>
            </Card>
          ) : (
            <ul className="mt-8 grid gap-6 lg:grid-cols-2">
              {upcoming.map((seminar) => (
                <li key={seminar.id}>
                  <SeminarCard seminar={seminar} platformLabel={PLATFORM_LABEL} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Past — recordings */}
        {past.length > 0 && (
          <section className="py-12 sm:py-16">
            <SectionHeading
              eyebrow="Watch again"
              title="Recorded seminars"
              subtitle="Missed a live session? Catch up with the full recording — still free."
            />
            <ul className="mt-8 grid gap-6 lg:grid-cols-2">
              {past.map((seminar) => (
                <li key={seminar.id}>
                  <SeminarCard seminar={seminar} platformLabel={PLATFORM_LABEL} isPast />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Closing CTA */}
        <section className="pb-16">
          <Card className="bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600 text-white">
            <CardBody className="flex flex-col items-center gap-4 py-10 text-center sm:py-12">
              <h2 className="max-w-2xl font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                Never miss a free seminar
              </h2>
              <p className="max-w-xl text-sky-100">
                Create a free account to register for live sessions, get reminders, and unlock the
                recordings.
              </p>
              <Button href="/register" variant="accent" size="lg">
                Create your account
              </Button>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  )
}

function SeminarCard({
  seminar,
  platformLabel,
  isPast = false,
}: {
  seminar: MarketingSeminar
  platformLabel: Record<SeminarPlatform, string>
  isPast?: boolean
}) {
  const when = formatWhen(seminar.scheduledAt)

  return (
    <Card hover className="h-full">
      <CardBody className="flex h-full flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone={isPast ? 'gray' : 'green'}>
            {isPast ? (
              <>
                <PlayCircle aria-hidden="true" className="h-3.5 w-3.5" />
                Recording
              </>
            ) : (
              <>
                <Radio aria-hidden="true" className="h-3.5 w-3.5" />
                Live
              </>
            )}
          </Badge>
          <Badge tone="sky">{platformLabel[seminar.platform]}</Badge>
          {seminar.tags.map((tag) => (
            <Badge key={tag} tone="navy">
              {tag}
            </Badge>
          ))}
        </div>

        <h3 className="font-display text-lg font-extrabold leading-snug text-navy-800">
          {seminar.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">{seminar.description}</p>

        <dl className="mt-4 space-y-1.5 text-sm text-navy-600">
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-navy-400" />
            <dt className="sr-only">Date</dt>
            <dd>
              {when.date} · {when.time}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-navy-400" />
            <dt className="sr-only">Duration</dt>
            <dd>{seminar.durationMin} min</dd>
          </div>
          <div className="flex items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-navy-400" />
            <dt className="sr-only">Host</dt>
            <dd>Hosted by {seminar.host}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3 pt-1">
          <Button
            href="/register"
            variant={isPast ? 'secondary' : 'primary'}
            size="sm"
            className={cn(isPast && 'gap-1.5')}
          >
            {isPast ? (
              <>
                <PlayCircle aria-hidden="true" className="h-4 w-4" />
                Watch recording
              </>
            ) : (
              'Register free'
            )}
          </Button>
          <span className="text-xs font-medium text-navy-400">Free · no subscription needed</span>
        </div>
      </CardBody>
    </Card>
  )
}
