import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  /** turns the card into a navigation link with a hover lift */
  href?: string
  hover?: boolean
}

export function Card({ children, className, href, hover }: CardProps) {
  const classes = cn(
    'rounded-2xl bg-white border border-navy-100 shadow-card',
    (hover || href) &&
      'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-navy-200',
    className,
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          classes,
          'block focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50',
        )}
      >
        {children}
      </Link>
    )
  }
  return <div className={classes}>{children}</div>
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5 sm:p-6', className)}>{children}</div>
}

export default Card
