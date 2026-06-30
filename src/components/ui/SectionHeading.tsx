import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  light = false,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
  light?: boolean
  className?: string
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', className)}>
      {eyebrow && (
        <p className={cn('mb-2 text-xs font-bold uppercase tracking-[0.18em]', light ? 'text-[#4dc3ee]/80' : 'text-navy-400')}>
          {eyebrow}
        </p>
      )}
      <h2 className={cn('font-display text-2xl font-extrabold tracking-tight sm:text-3xl', light ? 'text-white' : 'text-navy-800')}>
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-3 sm:text-lg', light ? 'text-navy-200' : 'text-navy-500')}>{subtitle}</p>
      )}
    </div>
  )
}

export default SectionHeading
