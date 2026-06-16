import type { MetadataRoute } from 'next'

/**
 * PWA web app manifest (Next.js 16 metadata route).
 *
 * Makes SVY installable on phones — valuable for UZ traffic, which is
 * overwhelmingly mobile. Served at `/manifest.webmanifest` and linked
 * automatically by Next from the document head.
 *
 * Brand: deep navy ink on soft sky-blue (theme `#1e3a5f`, bg `#f5f9fc`).
 *
 * Phase-2 follow-up: ship real raster PNG icons (192/512 + maskable) and an
 * offline service worker for true app-like behaviour. SVG icons below cover
 * install + home-screen for now; some platforms prefer PNG.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SVY — IELTS, CEFR & Multilevel',
    short_name: 'SVY',
    description:
      'Practice IELTS, CEFR and Multilevel with real exam-style tests, instant scoring and progress tracking. Built for learners in Uzbekistan.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#1e3a5f',
    background_color: '#f5f9fc',
    lang: 'en',
    dir: 'ltr',
    categories: ['education'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
