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
import { SectionHeading } from '@/components/ui/SectionHeading'
import { formatUzs } from '@/lib/format'
import { HeroSection } from '@/components/marketing/HeroSection'
import { AnimateIn, AnimateStagger, AnimateStaggerItem } from '@/components/ui/AnimateIn'

type IconType = ComponentType<{ className?: string }>

export const metadata: Metadata = {
  title: 'IELTS, SAT & General English prep — one subscription',
  description:
    'Prepare for IELTS and SAT with real exam-style mock tests, and build General English skills — answer keys, instant scoring and band estimates. One subscription — 20,000 UZS / month. Built for learners in Uzbekistan.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'Savynt — IELTS, SAT & General English preparation',
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
    focus: 'Global exam',
    copy: 'The global standard for studying, working and migrating abroad. Train with full mock tests and aim for the exact band score you need.',
    href: '/register',
    highlight: true,
  },
  {
    name: 'SAT',
    scale: 'Score 400 – 1600',
    focus: 'US admissions',
    copy: 'The exam required for US university admissions. Master evidence-based reading, writing and math with timed practice sets.',
    href: '/register',
  },
  {
    name: 'General English',
    scale: 'Beginner → Advanced',
    focus: 'Everyday fluency',
    copy: 'Build real communication skills from the ground up — vocabulary, grammar, speaking and writing for work, travel and daily life.',
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
    copy: 'Get a realistic IELTS band or SAT score estimate for every attempt.',
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
    copy: 'Create your account and unlock every IELTS, SAT and General English test for one monthly price.',
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
  'Full access to IELTS, SAT & General English tests',
  'Real mock tests with answer keys',
  'Instant scoring & band estimates',
  'Progress tracking on any device',
]

const PRICE_UZS = 20000

export default function LandingPage() {
  return (
    <div className="bg-sky-50">

      {/* 1 — HERO (client, animated) */}
      <HeroSection price={PRICE_UZS} />

      {/* 2 — Value prop */}
      <section className="border-b border-navy-100 bg-white">
        <AnimateStagger className="container-app grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: KeyRound, title: 'One subscription', copy: 'Every track and skill, unlocked.' },
            { icon: GraduationCap, title: 'Real exam-style tests', copy: 'Built to mirror the real thing.' },
            { icon: Gauge, title: 'Instant scoring', copy: 'See your result the moment you submit.' },
            { icon: LineChart, title: 'Progress that sticks', copy: 'Track every attempt and improve.' },
          ].map(({ icon: Icon, title, copy }) => (
            <AnimateStaggerItem key={title} className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-navy-800">{title}</p>
                <p className="mt-0.5 text-sm text-navy-500">{copy}</p>
              </div>
            </AnimateStaggerItem>
          ))}
        </AnimateStagger>
      </section>

      {/* 3 — Tracks */}
      <section className="container-app py-14 sm:py-16">
        <AnimateIn>
          <SectionHeading
            align="center"
            eyebrow="Choose your exam"
            title="Three ways to prepare"
            subtitle="Whether you need IELTS or SAT for abroad, or want to build everyday General English skills — Savynt has a full track for you."
          />
        </AnimateIn>
        <AnimateStagger className="mt-10 grid gap-6 md:grid-cols-3">
          {TRACKS.map((track) => (
            <AnimateStaggerItem key={track.name}>
              <Card hover href={track.href} className="group h-full">
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
            </AnimateStaggerItem>
          ))}
        </AnimateStagger>
      </section>

      {/* 4 — Four skills — dark glass section */}
      <section className="relative overflow-hidden bg-navy-900 py-14 sm:py-20">
        {/* Aurora bg */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#4dc3ee]/15 blur-[70px]" />
          <div className="animate-blob-slow absolute -bottom-16 left-10 h-72 w-72 rounded-full bg-accent-400/10 blur-[70px]" style={{ animationDelay: '4s' }} />
        </div>
        <div className="container-app relative">
          <AnimateIn>
            <SectionHeading
              align="center"
              eyebrow="Complete coverage"
              title="Master all four skills"
              subtitle="Balanced practice across every part of the exam — Listening, Reading, Speaking and Writing."
              light
            />
          </AnimateIn>
          <AnimateStagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SKILLS.map(({ icon: Icon, label, blurb }) => (
              <AnimateStaggerItem key={label}>
                <div className="group h-full rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-sm transition-all duration-300 hover:border-[#4dc3ee]/40 hover:bg-white/12 hover:shadow-lg sm:p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#4dc3ee]/20 text-[#4dc3ee]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-white">{label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-200">{blurb}</p>
                </div>
              </AnimateStaggerItem>
            ))}
          </AnimateStagger>
        </div>
      </section>

      {/* 5 — Why Savynt */}
      <section className="container-app py-14 sm:py-16">
        <AnimateIn>
          <SectionHeading
            align="center"
            eyebrow="Why Savynt"
            title="Everything you need to prepare"
            subtitle="A complete prep toolkit, not a pile of PDFs — all included for one monthly price."
          />
        </AnimateIn>
        <AnimateStagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, copy }) => (
            <AnimateStaggerItem key={title}>
              <Card hover className="h-full">
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
            </AnimateStaggerItem>
          ))}
        </AnimateStagger>
      </section>

      {/* 6 — How it works */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container-app">
          <AnimateIn>
            <SectionHeading
              align="center"
              eyebrow="Simple by design"
              title="How it works"
              subtitle="Three steps from sign-up to a higher score."
            />
          </AnimateIn>
          <AnimateStagger className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <AnimateStaggerItem key={step.title} className="relative">
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
              </AnimateStaggerItem>
            ))}
          </AnimateStagger>
        </div>
      </section>

      {/* 7 — Pricing teaser */}
      <section className="container-app py-14 sm:py-16">
        <AnimateIn>
          <Card className="overflow-hidden border-navy-200">
            <div className="grid lg:grid-cols-2">
              <div className="relative overflow-hidden bg-navy-700 p-8 text-white sm:p-10">
                <div aria-hidden="true" className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#4dc3ee]/20 blur-3xl" />
                <div className="relative">
                  <Badge tone="accent">Most popular</Badge>
                  <h3 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">Monthly plan</h3>
                  <p className="mt-2 text-sky-200">One price, full access. No hidden fees, cancel anytime.</p>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="font-display text-4xl font-extrabold sm:text-5xl">{formatUzs(PRICE_UZS)}</span>
                    <span className="pb-1 text-sky-200">/ month</span>
                  </div>
                  <div className="mt-8">
                    <Button href="/pricing" variant="accent" size="lg">
                      See pricing
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <CardBody className="p-8 sm:p-10">
                <p className="text-sm font-bold uppercase tracking-wider text-navy-400">What&apos;s included</p>
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
        </AnimateIn>
      </section>

      {/* 8 — Free seminars teaser */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container-app">
          <AnimateIn>
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
                      higher across IELTS, SAT and General English.
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-navy-700 transition-colors group-hover:text-navy-800">
                  See seminars
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardBody>
            </Card>
          </AnimateIn>
        </div>
      </section>

      {/* 9 — Final CTA */}
      <section className="relative overflow-hidden bg-navy-900">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#4dc3ee]/15 blur-[80px]" />
          <div className="animate-blob-slow absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-accent-400/10 blur-[80px]" style={{ animationDelay: '5s' }} />
        </div>
        <div className="container-app relative py-20 text-center sm:py-24">
          <AnimateIn>
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to reach your{' '}
              <span className="text-[#4dc3ee]">target score?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-navy-200">
              Join learners across Uzbekistan preparing smarter — IELTS, SAT &amp; General English
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
          </AnimateIn>
        </div>
      </section>

    </div>
  )
}
