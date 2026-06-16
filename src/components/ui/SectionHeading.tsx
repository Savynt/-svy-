import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', className)}>
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">{eyebrow}</p>
      )}
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-navy-500 sm:text-lg">{subtitle}</p>}
    </div>
  )
}

export default SectionHeading
