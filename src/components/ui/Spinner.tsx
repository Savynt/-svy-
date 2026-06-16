import { cn } from '@/lib/cn'

type SpinnerSize = 'sm' | 'md' | 'lg'

const sizes: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
}

export interface SpinnerProps {
  size?: SpinnerSize
  /** 'navy' on light backgrounds, 'light' on navy/dark backgrounds. */
  variant?: 'navy' | 'light'
  className?: string
  /** Accessible label announced to screen readers. */
  label?: string
}

/**
 * Brand spinner — a calm navy/sky ring that spins. Presentational and
 * server-renderable (no client state). Uses Tailwind's built-in
 * `animate-spin`; the ring is one tinted edge over a translucent track.
 */
export function Spinner({
  size = 'md',
  variant = 'navy',
  className,
  label = 'Loading',
}: SpinnerProps) {
  const ring =
    variant === 'light'
      ? 'border-white/25 border-t-white'
      : 'border-navy-200 border-t-navy-700'

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center justify-center', className)}
    >
      <span
        className={cn('animate-spin rounded-full', sizes[size], ring)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export default Spinner
