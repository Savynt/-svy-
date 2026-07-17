import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { LocaleProvider } from '@/i18n/client'
import { getLocale } from '@/i18n/server'
import { JsonLd } from '@/components/seo/JsonLd'
import { organizationLd, webSiteLd } from '@/lib/seo/jsonLd'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Savynt — IELTS, SAT & General English preparation',
    template: '%s · Savynt',
  },
  description:
    'Practice IELTS, SAT and General English with real exam-style tests, instant scoring and progress tracking. Built for learners in Uzbekistan.',
  keywords: ['IELTS', 'SAT', 'General English', 'English', 'Uzbekistan', 'mock test', 'practice'],
  openGraph: {
    type: 'website',
    siteName: 'Savynt',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    shortcut: '/favicon-32.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        {/* Identity of the site + publisher — every Course/Offer references it. */}
        <JsonLd data={[organizationLd(), webSiteLd()]} />
        <LocaleProvider locale={locale}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  )
}
