import type { Metadata } from 'next'
import { GraduationCap, HeartHandshake, Languages, MapPin, Target, Wallet } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'About SVY',
  description:
    'SVY is exam prep built for Uzbekistan — affordable, real exam-style practice for IELTS, SAT and General English, with instant scoring and clear progress. Our mission is simple: make a great score reachable for every learner.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About SVY — exam prep built for Uzbekistan',
    description:
      'Affordable, exam-style IELTS, SAT and General English practice with instant scoring and clear progress, made for learners in Uzbekistan.',
    url: '/about',
  },
}

const VALUES = [
  {
    icon: Wallet,
    title: 'Affordable by design',
    text: 'Quality prep should not cost more than a textbook. One subscription from 20,000 UZS / month unlocks everything — paid locally with Click, Payme or Uzcard.',
  },
  {
    icon: Target,
    title: 'Real exam conditions',
    text: 'Tasks mirror the actual IELTS, SAT and General English formats — the same question types, timing and marking, so the exam feels familiar.',
  },
  {
    icon: GraduationCap,
    title: 'Progress you can see',
    text: 'Instant scoring, band estimates and per-skill tracking show exactly where you stand and what to practise next.',
  },
  {
    icon: HeartHandshake,
    title: 'Support that helps',
    text: 'Clear explanations, grammar lessons and tutor reviews on the yearly plan — help when you need it, not just a score.',
  },
] as const

const STATS = [
  { value: 'IELTS · SAT · General English', label: 'Tracks covered' },
  { value: 'Beginner → Advanced', label: 'Levels supported' },
  { value: '4 skills', label: 'Listening · Reading · Speaking · Writing' },
] as const

export default function AboutPage() {
  return (
    <div>
      <PageHero
        eyebrow="About"
        title="Exam prep built for Uzbekistan"
        subtitle="SVY helps learners across Uzbekistan reach the IELTS, SAT and General English scores they need — for university, for work abroad, and for themselves."
        breadcrumbs={[{ label: 'About' }]}
      >
        <div className="flex items-center gap-2 text-sm text-sky-100">
          <MapPin aria-hidden="true" className="h-4 w-4" />
          <span>Made in Uzbekistan, for learners in Uzbekistan</span>
        </div>
      </PageHero>

      <div className="container-app">
        {/* Mission */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
              Our mission
            </p>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
              Make a great score reachable for every learner
            </h2>
            <p className="mt-4 text-navy-500 sm:text-lg">
              A strong English certificate opens doors — to a university place, a scholarship, a job
              abroad. But good preparation has been expensive and hard to find. We built SVY to
              change that: realistic, exam-style practice for IELTS, SAT and General English, with
              instant feedback and a clear path to your target — at a price that makes sense in
              Uzbekistan.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STATS.map((stat) => (
              <Card key={stat.label}>
                <CardBody className="text-center">
                  <p className="font-display text-xl font-extrabold tracking-tight text-navy-800">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-navy-500">{stat.label}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="pb-4">
          <SectionHeading
            eyebrow="What we stand for"
            title="The principles behind SVY"
            subtitle="Every decision we make comes back to these four ideas."
          />

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {VALUES.map((value) => (
              <Card key={value.title}>
                <CardBody className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                    <value.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-navy-800">{value.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-navy-500">{value.text}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* Language / accessibility note */}
        <section className="py-12 sm:py-16">
          <Card>
            <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
                <Languages aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-navy-800">
                  Clear English, made for Uzbek learners
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-navy-500">
                  Instructions and explanations are written in plain, simple English so the language
                  never gets in the way of learning. The whole platform is mobile-first — built to
                  work well on the phone you already carry.
                </p>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Closing CTA */}
        <section className="pb-16">
          <Card className="bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600 text-white">
            <CardBody className="flex flex-col items-center gap-4 py-10 text-center sm:py-12">
              <h2 className="max-w-2xl font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                Ready to start preparing?
              </h2>
              <p className="max-w-xl text-sky-100">
                Create a free account and take your first practice test today. Subscribe when
                you’re ready — from 20,000 UZS / month, cancel anytime.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button href="/register" variant="accent" size="lg">
                  Create your account
                </Button>
                <Button href="/pricing" variant="secondary" size="lg">
                  See pricing
                </Button>
              </div>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  )
}
