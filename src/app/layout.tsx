import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

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
    default: 'SVY — IELTS, CEFR & Multilevel preparation',
    template: '%s · SVY',
  },
  description:
    'Practice IELTS, CEFR and Multilevel with real exam-style tests, instant scoring and progress tracking. Built for learners in Uzbekistan.',
  keywords: ['IELTS', 'CEFR', 'Multilevel', 'English', 'Uzbekistan', 'mock test', 'practice'],
  openGraph: {
    type: 'website',
    siteName: 'SVY',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  )
}
