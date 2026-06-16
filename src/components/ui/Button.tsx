'use client'

import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50 disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary: 'bg-navy-700 text-white hover:bg-navy-800 shadow-sm hover:shadow-md',
  secondary: 'bg-white text-navy-700 border border-navy-200 hover:border-navy-300 hover:bg-navy-50',
  ghost: 'text-navy-700 hover:bg-navy-50',
  accent: 'bg-accent-500 text-navy-900 hover:bg-accent-400 shadow-sm',
}

const sizes: Record<Size, string> = {
  // min-h keeps a comfortable touch target (48px on the lg / full-width CTAs)
  sm: 'text-sm px-3.5 py-2 min-h-[40px]',
  md: 'text-sm px-5 py-2.5 min-h-[44px]',
  lg: 'text-base px-6 py-3 min-h-[48px]',
}

interface StyleProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

type ButtonAsLink = StyleProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'color' | 'children' | 'className'> & {
    href: string
  }

type ButtonAsButton = StyleProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'children' | 'className'> & {
    href?: undefined
  }

export type ButtonProps = ButtonAsLink | ButtonAsButton

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className)

  if (rest.href !== undefined) {
    const { href, ...anchorProps } = rest as Omit<ButtonAsLink, keyof StyleProps>
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    )
  }

  const { type, ...buttonProps } = rest as Omit<ButtonAsButton, keyof StyleProps>
  return (
    <button type={type ?? 'button'} className={classes} {...buttonProps}>
      {children}
    </button>
  )
}

export default Button
