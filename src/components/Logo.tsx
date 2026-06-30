import Image from 'next/image'
import { cn } from '@/lib/cn'

interface LogoProps {
  /** pixel size of the mark */
  size?: number
  withWordmark?: boolean
  className?: string
  /** 'navy' on light backgrounds, 'light' on navy backgrounds */
  variant?: 'navy' | 'light'
}

export function Logo({ size = 36, withWordmark = true, className, variant = 'navy' }: LogoProps) {
  const wordmarkColor = variant === 'light' ? '#ffffff' : '#1e3a5f'

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/logo.png"
        alt="SVY"
        width={size}
        height={size}
        className="shrink-0 object-contain"
        priority
      />
      {withWordmark && (
        <span className="font-display text-xl font-extrabold tracking-tight" style={{ color: wordmarkColor }}>
          SVY
        </span>
      )}
    </span>
  )
}

export default Logo
