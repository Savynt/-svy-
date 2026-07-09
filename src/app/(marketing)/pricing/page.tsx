import type { Metadata } from 'next'
import {
  Check,
  CheckCircle2,
  CreditCard,
  Minus,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatUzs } from '@/lib/format'
import { cn } from '@/lib/cn'
import { FAQS, FEATURE_ROWS, PAYMENT_METHODS, PLANS } from '@/data/marketing'
import { Faq } from './Faq'

export const metadata: Metadata = {
  title: 'Pricing — one plan, full access',
  description:
    'Simple pricing for Savynt: from 20,000 UZS / month for full access to every IELTS, SAT and General English practice test, the vocabulary trainer and all grammar lessons. Pay locally with Click, Payme or Uzcard.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Savynt Pricing — one plan, full access',
    description:
      'From 20,000 UZS / month. Every IELTS, SAT and General English test, vocabulary and grammar — pay with Click, Payme or Uzcard.',
    url: '/pricing',
  },
}

const REASSURANCE = [
  {
    icon: ShieldCheck,
    title: 'Cancel anytime',
    text: 'No lock-in. Stop with one tap from your dashboard and keep access until your period ends.',
  },
  {
    icon: Wallet,
    title: 'No hidden fees',
    text: 'One clear price in UZS. What you see is what you pay — no extra charges.',
  },
  {
    icon: CreditCard,
    title: 'Local payments',
    text: 'Pay the way you already do — Click, Payme, or any Uzcard / Humo card.',
  },
] as const

const COMPARISON_COLUMNS = ['Monthly', '3 Months', 'Yearly'] as const

export default function PricingPage() {
  return (
    <div>
      <PageHero
        eyebrow="Pricing"
        title="Simple pricing, full access"
        subtitle="One subscription unlocks every IELTS, SAT and General English practice test, the vocabulary trainer and all grammar lessons. Pay in UZS with Click, Payme or Uzcard."
        breadcrumbs={[{ label: 'Pricing' }]}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-sky-100">
          <span className="font-medium text-white">We accept:</span>
          {PAYMENT_METHODS.map((m) => (
            <span
              key={m}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/20"
            >
              {m}
            </span>
          ))}
        </div>
      </PageHero>

      <div className="container-app">
        {/* Plan cards */}
        <section className="py-12 sm:py-16">
          <SectionHeading
            align="center"
            eyebrow="Choose a plan"
            title="Pick the period that suits you"
            subtitle="The same full access on every plan — longer periods simply cost less per month and add a few extras."
          />

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const featured = plan.highlight
              return (
                <Card
                  key={plan.code}
                  className={cn(
                    'relative',
                    featured && 'border-accent-400 ring-2 ring-accent-400 md:scale-[1.03]',
                  )}
                >
                  <CardBody className="flex h-full flex-col">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-display text-xl font-extrabold text-navy-800">
                        {plan.name}
                      </h3>
                      {featured && (
                        <Badge tone="accent">
                          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                          Most popular
                        </Badge>
                      )}
                    </div>

                    <div className="mb-1 flex items-baseline gap-1.5">
                      <span className="font-display text-3xl font-extrabold tracking-tight text-navy-900">
                        {formatUzs(plan.priceUzs)}
                      </span>
                      <span className="text-sm font-medium text-navy-400">{plan.period}</span>
                    </div>
                    <p className="mb-5 text-sm text-navy-500">
                      {plan.note ?? 'Billed in UZS via Click, Payme or Uzcard.'}
                    </p>

                    <ul className="mb-6 space-y-2.5">
                      {plan.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2.5 text-sm text-navy-600">
                          <Check
                            aria-hidden="true"
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                          />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto">
                      <Button
                        href="/register"
                        variant={featured ? 'accent' : 'primary'}
                        className="w-full"
                      >
                        Choose {plan.name}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-navy-400">
            Prices are in Uzbek so&apos;m (UZS). Every plan gives the exact same content — no feature
            is ever locked behind a higher tier except tutor reviews on Yearly.
          </p>
        </section>

        {/* Feature comparison */}
        <section className="py-12 sm:py-16">
          <SectionHeading
            eyebrow="What's included"
            title="Everything you need to prepare"
            subtitle="Core preparation is identical on every plan. Higher tiers add a few power-user extras."
          />

          <Card className="mt-8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <caption className="sr-only">
                  Feature comparison across the Monthly, 3 Months and Yearly plans
                </caption>
                <thead>
                  <tr className="border-b border-navy-100 bg-navy-50/60">
                    <th scope="col" className="px-5 py-4 text-sm font-bold text-navy-700">
                      Feature
                    </th>
                    {COMPARISON_COLUMNS.map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-4 py-4 text-center text-sm font-bold text-navy-700"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_ROWS.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 1 ? 'bg-navy-50/40' : undefined}>
                      <th
                        scope="row"
                        className="px-5 py-3.5 text-left text-sm font-medium text-navy-700"
                      >
                        {row.label}
                      </th>
                      <ComparisonCell on={row.monthly} />
                      <ComparisonCell on={row.quarterly} />
                      <ComparisonCell on={row.yearly} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Reassurance row */}
        <section className="pb-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {REASSURANCE.map((item) => (
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

        {/* FAQ */}
        <section className="py-12 sm:py-16">
          <SectionHeading
            align="center"
            eyebrow="FAQ"
            title="Questions, answered"
            subtitle="Everything else you might want to know before you subscribe."
          />
          <Faq items={FAQS} />
        </section>

        {/* Closing CTA */}
        <section className="pb-16">
          <Card className="bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600 text-white">
            <CardBody className="flex flex-col items-center gap-4 py-10 text-center sm:py-12">
              <h2 className="max-w-2xl font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                Start preparing today for {formatUzs(20000)} / month
              </h2>
              <p className="max-w-xl text-sky-100">
                One subscription, every IELTS, SAT &amp; General English test, vocabulary and grammar.
                Cancel anytime.
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

function ComparisonCell({ on }: { on: boolean }) {
  return (
    <td className="px-4 py-3.5 text-center">
      {on ? (
        <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" role="img" aria-label="Included" />
      ) : (
        <Minus className="mx-auto h-5 w-5 text-navy-300" role="img" aria-label="Not included" />
      )}
    </td>
  )
}
