import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'navy' | 'sky' | 'accent' | 'green' | 'gray' | 'red'

const tones: Record<Tone, string> = {
  navy: 'bg-navy-700 text-white',
  sky: 'bg-sky-200 text-navy-700',
  accent: 'bg-accent-400/20 text-accent-600',
  green: 'bg-emerald-100 text-emerald-700',
  gray: 'bg-navy-50 text-navy-500',
  red: 'bg-red-100 text-red-700',
}

export function Badge({
  children,
  tone = 'sky',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export default Badge
