'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

/**
 * Error boundary for the student app shell. Renders inside the layout, so the
 * navbar stays put. Friendly copy + retry (reset) + a safe link home.
 */
export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Student zone error:', error)
  }, [error])

  return (
    <div className="container-app flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-lg">
        <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-400/20 text-accent-600">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800">
              Something went wrong
            </h1>
            <p className="mx-auto mt-2 max-w-md text-navy-500">
              We couldn&apos;t load this page. It&apos;s usually temporary — try again, or head back
              to your dashboard.
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-navy-300">Reference: {error.digest}</p>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => reset()} variant="primary" size="lg">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button href="/dashboard" variant="secondary" size="lg">
              Back to dashboard
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
