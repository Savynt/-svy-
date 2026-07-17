import { ImageResponse } from 'next/og'

/**
 * Social preview card, generated at build time.
 *
 * Applies to every route that doesn't override it, and it's the image
 * `organizationLd()` points at (see src/lib/seo/jsonLd.ts) — that reference is
 * why this file has to exist rather than being a nice-to-have.
 *
 * Drawn with plain divs and no custom font so nothing is fetched at render.
 */
export const alt = 'Savynt — IELTS, SAT & General English preparation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #16304d 0%, #1e3a5f 55%, #2c5f8a 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#7dd3fc',
          }}
        >
          Savynt
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          IELTS, SAT &amp; General English preparation
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 34,
            color: '#cbe3f7',
          }}
        >
          Real exam-style mock tests, instant scoring and band estimates.
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 44,
            fontSize: 30,
            fontWeight: 700,
            color: '#fbbf24',
          }}
        >
          One subscription — 20,000 UZS / month
        </div>
      </div>
    ),
    size,
  )
}
