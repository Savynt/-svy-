'use client'

import { useEffect } from 'react'

/**
 * Global error boundary — catches errors thrown in the ROOT layout/template,
 * so it must render its own <html> and <body> (it replaces the root layout).
 * Kept dependency-light and self-styled: the root layout (fonts, globals) may
 * not have mounted, so we avoid relying on design-system context here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface for monitoring; replace with a reporter when wired.
    console.error('Global error boundary:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          backgroundColor: '#f5f9fc',
          color: '#101f34',
          fontFamily:
            'var(--font-inter), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'flex',
            height: 56,
            width: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            backgroundColor: '#e8f1f8',
            color: '#1e3a5f',
            fontSize: 26,
          }}
        >
          ⚠
        </span>

        <div style={{ maxWidth: 460 }}>
          <h1
            style={{
              margin: 0,
              fontFamily:
                'var(--font-jakarta), var(--font-inter), system-ui, sans-serif',
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: '#172d4a',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: '0.75rem', color: '#356391', lineHeight: 1.55 }}>
            We hit an unexpected error and couldn&apos;t load Savynt. Please try again — if it keeps
            happening, head back to the home page.
          </p>
          {error.digest && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#7fa9cb' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              minHeight: 48,
              padding: '0 1.5rem',
              borderRadius: '0.9rem',
              border: 'none',
              backgroundColor: '#1e3a5f',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 48,
              padding: '0 1.5rem',
              borderRadius: '0.9rem',
              border: '1px solid #aecbe1',
              backgroundColor: '#ffffff',
              color: '#1e3a5f',
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  )
}
