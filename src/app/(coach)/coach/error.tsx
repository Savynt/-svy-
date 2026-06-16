'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

/**
 * Error boundary for the coach panel. Renders inside the coach layout (sidebar
 * stays put). Friendly copy + retry (reset) + a link back to the overview.
 */
export default function CoachError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Coach zone error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-400/20 text-accent-600">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800">
              We couldn&apos;t load this
            </h1>
            <p className="mx-auto mt-2 max-w-md text-navy-500">
              Something went wrong in the coach panel. This is usually temporary — try again, or go
              back to your overview.
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
            <Button href="/coach" variant="secondary" size="lg">
              Back to overview
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
