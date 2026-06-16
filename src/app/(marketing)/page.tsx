import type { Metadata } from 'next'
import type { ComponentType } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Gauge,
  GraduationCap,
  Headphones,
  KeyRound,
  LineChart,
  Mic,
  PenLine,
  Smartphone,
  Sparkles,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Logo } from '@/components/Logo'
import { formatUzs } from '@/lib/format'

type IconType = ComponentType<{ className?: string }>

export const metadata: Metadata = {
  title: 'IELTS, CEFR & Multilevel prep — one subscription',
  description:
    'Prepare for IELTS, CEFR and the Multilevel national exam with real exam-style mock tests, answer keys, instant scoring and band estimates. One subscription — 20,000 UZS / month. Built for learners in Uzbekistan.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'SVY — IELTS, CEFR & Multilevel preparation',
    description:
      'Real exam-style mock tests with answer keys, instant scoring and band estimates. One subscription — 20,000 UZS / month.',
    url: '/',
  },
}

const TRACKS: {
  name: string
  scale: string
  focus: string
  copy: string
  href: string
  highlight?: boolean
}[] = [
  {
    name: 'IELTS',
    scale: 'Bands 4 – 9',
    focus: 'Launch focus',
    copy: 'The global exam for studying, working and migrating abroad. Train with full mock tests and aim for the exact band score you need.',
    href: '/register',
    highlight: true,
  },
  {
    name: 'CEFR',
    scale: 'A1 – C2',
    focus: 'European standard',
    copy: 'The level framework used across schools and universities. Climb from A1 to C2 with focused practice in every skill.',
    href: '/register',
  },
  {
    name: 'Multilevel',
    scale: 'A2 – C1',
    focus: 'National UZ exam',
    copy: 'The Multilevel certificate used for admission and graduation in Uzbekistan. Practise the real format and grading.',
    href: '/register',
  },
]

const SKILLS: { icon: IconType; label: string; blurb: string }[] = [
  { icon: Headphones, label: 'Listening', blurb: 'Train your ear with audio recordings and timed question sets.' },
  { icon: BookOpen, label: 'Reading', blurb: 'Skim, scan and analyse texts under real exam time pressure.' },
  { icon: Mic, label: 'Speaking', blurb: 'Practise spoken answers with prompts, cue cards and model responses.' },
  { icon: PenLine, label: 'Writing', blurb: 'Write essays, reports and letters with structure and band guidance.' },
]

const FEATURES: { icon: IconType; title: string; copy: string }[] = [
  {
    icon: KeyRound,
    title: 'Real mock tests with answer keys',
    copy: 'Complete, exam-style tests with full answer keys so you always know why an answer is right.',
  },
  {
    icon: Gauge,
    title: 'Instant scoring',
    copy: 'Submit and see your result straight away — no waiting, no manual checking.',
  },
  {
    icon: Target,
    title: 'Band & level estimates',
    copy: 'Get a realistic IELTS band, CEFR level and Multilevel grade for every attempt.',
  },
  {
    icon: CalendarDays,
    title: 'Free seminars',
    copy: 'Join live sessions on exam strategy and common mistakes — included at no extra cost.',
  },
  {
    icon: LineChart,
    title: 'Progress tracking',
    copy: 'See completed tests, rising scores and exactly which skill to work on next.',
  },
  {
    icon: Smartphone,
    title: 'Study on any device',
    copy: 'Phone, tablet or laptop — your progress follows you everywhere you study.',
  },
]

const STEPS: { title: string; copy: string }[] = [
  {
    title: 'Register',
    copy: 'Create your account and unlock every IELTS, CEFR and Multilevel test for one monthly price.',
  },
  {
    title: 'Practice',
    copy: 'Work through full mock tests and short drills across Listening, Reading, Speaking and Writing.',
  },
  {
    title: 'Track',
    copy: 'Watch your scores rise, follow band estimates and focus on your weakest skills.',
  },
]

const PLAN_PERKS = [
  'Full access to IELTS, CEFR & Multilevel tests',
  'Real mock tests with answer keys',
  'Instant scoring & band estimates',
  'Progress tracking on any device',
]

const PRICE_UZS = 20000

export default function LandingPage() {
  return (
    <div className="bg-sky-50">
      {/* 1 — HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-800 via-navy-700 to-navy-700 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-accent-400/10 blur-3xl"
        />
        <div className="container-app relative py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* left */}
            <div className="animate-fade-up">
              <Badge tone="accent">
                <Sparkles className="h-3.5 w-3.5" />
                IELTS · CEFR · Multilevel prep
              </Badge>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Pass your English exam with confidence.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-sky-200">
                One subscription unlocks real exam-style mock tests, instant scoring, band estimates
                and progress tracking — everything you need to reach your target, in one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href="/register" variant="accent" size="lg">
                  Start — {formatUzs(PRICE_UZS)} / month
                </Button>
                <Button href="/register" variant="secondary" size="lg">
                  Explore IELTS
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm font-medium text-sky-200">
                <span aria-hidden="true">🇺🇿</span>
                Built for learners in Uzbekistan
              </p>
            </div>

            {/* right — designed mockup */}
            <div className="relative">
              <div className="absolute -left-3 top-6 z-20 hidden sm:block">
                <SkillChip icon={Headphones} label="Listening" />
              </div>
              <div className="absolute -right-2 top-24 z-20 hidden sm:block">
                <SkillChip icon={BookOpen} label="Reading" />
              </div>
              <div className="absolute -bottom-4 left-10 z-20 hidden sm:block">
                <SkillChip icon={Mic} label="Speaking" />
              </div>

              <div className="absolute inset-0 -z-0 translate-y-6 scale-95 rounded-[2rem] bg-navy-950/40 blur-2xl" />

              <Card className="relative z-10 shadow-card-hover">
                <CardBody className="space-y-5">
                  <div className="flex items-center justify-between">
                    <Logo size={48} />
                    <Badge tone="green">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Today
                    </Badge>
                  </div>

                  <div className="rounded-xl border border-navy-100 bg-sky-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-navy-400">
                        Sample · IELTS Reading
                      </p>
                      <Badge tone="sky">Q14 / 40</Badge>
                    </div>
                    <p className="font-medium text-navy-700">
                      The passage mainly discusses the effects of climate on coastal cities.
                    </p>
                    <div className="mt-3 space-y-2">
                      <Option label="True" active />
                      <Option label="False" />
                      <Option label="Not given" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-navy-700">Weekly goal</span>
                      <span className="font-semibold text-navy-500">68%</span>
                    </div>
                    <ProgressBar value={68} />
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <Stat value="3" label="Tracks" />
                      <Stat value="5.0→7.0" label="Band" />
                      <Stat value="12" label="Day streak" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Value prop */}
      <section className="border-b border-navy-100 bg-white">
        <div className="container-app grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: KeyRound, title: 'One subscription', copy: 'Every track and skill, unlocked.' },
            { icon: GraduationCap, title: 'Real exam-style tests', copy: 'Built to mirror the real thing.' },
            { icon: Gauge, title: 'Instant scoring', copy: 'See your result the moment you submit.' },
            { icon: LineChart, title: 'Progress that sticks', copy: 'Track every attempt and improve.' },
          ].map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-navy-800">{title}</p>
                <p className="mt-0.5 text-sm text-navy-500">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Tracks */}
      <section className="container-app py-14 sm:py-16">
        <SectionHeading
          align="center"
          eyebrow="Choose your exam"
          title="Three tracks, one platform"
          subtitle="Whether you need IELTS for abroad, a CEFR level for university or the Multilevel certificate at home, SVY has a full track for you."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TRACKS.map((track) => (
            <Card key={track.name} hover href={track.href} className="group h-full">
              <CardBody className="flex h-full flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <Badge tone="sky">{track.scale}</Badge>
                  <Badge tone={track.highlight ? 'accent' : 'gray'}>{track.focus}</Badge>
                </div>
                <h3 className="font-display text-2xl font-extrabold text-navy-800">{track.name}</h3>
                <p className="flex-1 text-navy-500">{track.copy}</p>
                <span className="inline-flex items-center gap-1.5 font-semibold text-navy-700 transition-colors group-hover:text-navy-800">
                  Explore {track.name}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* 4 — Four skills */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container-app">
          <SectionHeading
            align="center"
            eyebrow="Complete coverage"
            title="Master all four skills"
            subtitle="Balanced practice across every part of the exam — Listening, Reading, Speaking and Writing."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SKILLS.map(({ icon: Icon, label, blurb }) => (
              <Card key={label} hover className="h-full">
                <CardBody className="flex h-full flex-col">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-navy-800">{label}</h3>
                  <p className="mt-2 flex-1 text-sm text-navy-500">{blurb}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — Why SVY */}
      <section className="container-app py-14 sm:py-16">
        <SectionHeading
          align="center"
          eyebrow="Why SVY"
          title="Everything you need to prepare"
          subtitle="A complete prep toolkit, not a pile of PDFs — all included for one monthly price."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, copy }) => (
            <Card key={title} hover className="h-full">
              <CardBody className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-400/20 text-accent-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-navy-800">{title}</h3>
                  <p className="mt-1 text-sm text-navy-500">{copy}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* 6 — How it works */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container-app">
          <SectionHeading
            align="center"
            eyebrow="Simple by design"
            title="How it works"
            subtitle="Three steps from sign-up to a higher score."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <Card className="h-full">
                  <CardBody>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-navy-700 font-display text-lg font-extrabold text-white">
                      {i + 1}
                    </span>
                    <h3 className="mt-4 font-display text-xl font-bold text-navy-800">{step.title}</h3>
                    <p className="mt-2 text-navy-500">{step.copy}</p>
                  </CardBody>
                </Card>
                {i < STEPS.length - 1 && (
                  <ArrowRight
                    aria-hidden="true"
                    className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-navy-300 md:block"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — Pricing teaser */}
      <section className="container-app py-14 sm:py-16">
        <Card className="overflow-hidden border-navy-200">
          <div className="grid lg:grid-cols-2">
            <div className="bg-navy-700 p-8 text-white sm:p-10">
              <Badge tone="accent">Most popular</Badge>
              <h3 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">Monthly plan</h3>
              <p className="mt-2 text-sky-200">
                One price, full access. No hidden fees, cancel anytime.
              </p>
              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-4xl font-extrabold sm:text-5xl">
                  {formatUzs(PRICE_UZS)}
                </span>
                <span className="pb-1 text-sky-200">/ month</span>
              </div>
              <div className="mt-8">
                <Button href="/pricing" variant="accent" size="lg">
                  See pricing
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardBody className="p-8 sm:p-10">
              <p className="text-sm font-bold uppercase tracking-wider text-navy-400">
                What&apos;s included
              </p>
              <ul className="mt-4 space-y-3">
                {PLAN_PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-3 text-navy-600">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-navy-400">
                Longer plans available — see the pricing page for the full comparison.
              </p>
            </CardBody>
          </div>
        </Card>
      </section>

      {/* 8 — Free seminars teaser */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container-app">
          <Card hover href="/seminars" className="group overflow-hidden">
            <CardBody className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-400/20 text-accent-600">
                  <CalendarDays className="h-6 w-6" />
                </span>
                <div>
                  <Badge tone="green">Free</Badge>
                  <h3 className="mt-3 font-display text-xl font-bold text-navy-800 sm:text-2xl">
                    Live seminars on exam strategy
                  </h3>
                  <p className="mt-2 max-w-xl text-navy-500">
                    Join free online sessions covering exam tactics, common mistakes and how to score
                    higher across IELTS, CEFR and Multilevel.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-navy-700 transition-colors group-hover:text-navy-800">
                See seminars
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* 9 — Final CTA */}
      <section className="bg-navy-700">
        <div className="container-app py-16 text-center sm:py-20">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to reach your target score?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-sky-200">
            Join learners across Uzbekistan preparing smarter — all IELTS, CEFR and Multilevel
            practice for {formatUzs(PRICE_UZS)} / month.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/register" variant="accent" size="lg">
              Start your prep today
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/pricing" variant="ghost" size="lg">
              Compare plans
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function SkillChip({ icon: Icon, label }: { icon: IconType; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-navy-100 bg-white px-3 py-1.5 text-sm font-semibold text-navy-700 shadow-card">
      <Icon className="h-4 w-4 text-navy-500" />
      {label}
    </span>
  )
}

function Option({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className={
        active
          ? 'flex items-center gap-2 rounded-lg border border-navy-300 bg-white px-3 py-2 text-sm font-semibold text-navy-800'
          : 'flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-500'
      }
    >
      <span
        className={
          active
            ? 'inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-navy-600'
            : 'inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-navy-200'
        }
      >
        {active && <span className="h-2 w-2 rounded-full bg-navy-600" />}
      </span>
      {label}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-navy-100 bg-white px-2 py-3 text-center">
      <p className="font-display text-base font-extrabold text-navy-800">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-navy-400">{label}</p>
    </div>
  )
}
