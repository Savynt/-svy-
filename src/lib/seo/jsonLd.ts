import { env } from '@/lib/env'
import { FAQS, PLANS } from '@/data/marketing'

/**
 * schema.org structured data for the public pages.
 *
 * Why: search engines use it for rich results, and answer engines (ChatGPT,
 * Perplexity, Google AI Overviews) lean on it to state facts about a product —
 * what Savynt is, who it serves, what it costs. Without it they have to guess
 * from prose, and guesses about price are the ones that hurt.
 *
 * Everything here mirrors what the pages already say (`@/data/marketing`), so
 * the markup can't drift into claiming something the site doesn't.
 */

const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

/**
 * The brand, spelled the way the pages spell it.
 *
 * Hardcoded rather than `env.NEXT_PUBLIC_APP_NAME` on purpose: structured data
 * must always match the visible copy ("Savynt"), and pinning it here means a
 * stale or mis-set env var can never make the two disagree. Structured data
 * that contradicts the page it describes is worse than none — it's exactly the
 * claim an answer engine repeats.
 */
const APP_NAME = 'Savynt'

const ORGANIZATION_ID = `${baseUrl}/#organization`
const WEBSITE_ID = `${baseUrl}/#website`

/** The provider itself. Referenced by every Course/Offer via @id. */
export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': ORGANIZATION_ID,
    name: APP_NAME,
    url: baseUrl,
    description:
      'Online IELTS, SAT and General English preparation with real exam-style mock tests, answer keys, instant scoring and band estimates. Built for learners in Uzbekistan.',
    logo: `${baseUrl}/icon-512.png`,
    image: `${baseUrl}/opengraph-image`,
    areaServed: { '@type': 'Country', name: 'Uzbekistan' },
    availableLanguage: [
      { '@type': 'Language', name: 'English' },
      { '@type': 'Language', name: 'Uzbek' },
      { '@type': 'Language', name: 'Russian' },
    ],
    knowsAbout: ['IELTS', 'SAT', 'General English', 'English as a foreign language', 'CEFR'],
  }
}

export function webSiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: APP_NAME,
    url: baseUrl,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
  }
}

/**
 * The subscription, priced from the same source the pricing page renders.
 * Answer engines quote price constantly — it must come from one place.
 */
export function subscriptionOfferLd() {
  const offers = PLANS.map((p) => ({
    '@type': 'Offer',
    name: `${APP_NAME} — ${p.name}`,
    price: String(p.priceUzs),
    priceCurrency: 'UZS',
    category: 'subscription',
    url: `${baseUrl}/pricing`,
    availability: 'https://schema.org/InStock',
    eligibleRegion: { '@type': 'Country', name: 'Uzbekistan' },
  }))

  const cheapest = Math.min(...PLANS.map((p) => p.priceUzs))
  const dearest = Math.max(...PLANS.map((p) => p.priceUzs))

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${APP_NAME} subscription`,
    description:
      'One subscription covering every track, level and skill: IELTS, SAT and General English practice with instant scoring.',
    brand: { '@id': ORGANIZATION_ID },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'UZS',
      lowPrice: String(cheapest),
      highPrice: String(dearest),
      offerCount: offers.length,
      offers,
    },
  }
}

/**
 * The tracks the platform teaches.
 *
 * `hasCourseInstance` is deliberately omitted — these are self-paced practice
 * tracks, not scheduled cohorts, and claiming instances we don't run would be a
 * lie an answer engine would happily repeat.
 */
export function coursesLd() {
  const tracks: { name: string; description: string; about: string }[] = [
    {
      name: 'IELTS preparation',
      description:
        'Full IELTS practice across Listening, Reading, Writing and Speaking, with exam-style mock tests, answer keys and band estimates.',
      about: 'IELTS',
    },
    {
      name: 'SAT preparation',
      description:
        'SAT practice for English (EBRW) and Math, with exam-style questions and instant scoring.',
      about: 'SAT',
    },
    {
      name: 'General English',
      description:
        'General English practice from A1 to C2: grammar, listening, reading, writing and speaking, with instant feedback.',
      about: 'English as a foreign language',
    },
  ]

  return tracks.map((t) => ({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${t.name} — ${APP_NAME}`,
    description: t.description,
    about: t.about,
    url: baseUrl,
    provider: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
    educationalLevel: 'Beginner to Advanced (A1–C2)',
    isAccessibleForFree: false,
    offers: {
      '@type': 'Offer',
      price: String(PLANS[0]?.priceUzs ?? 20000),
      priceCurrency: 'UZS',
      url: `${baseUrl}/pricing`,
      availability: 'https://schema.org/InStock',
    },
  }))
}

/** The pricing page's FAQ, verbatim — same source the accordion renders. */
export function faqLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}
