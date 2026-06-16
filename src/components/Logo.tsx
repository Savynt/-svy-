import { cn } from '@/lib/cn'

interface LogoProps {
  /** pixel size of the square mark */
  size?: number
  withWordmark?: boolean
  className?: string
  /** 'navy' on light backgrounds, 'light' on navy backgrounds */
  variant?: 'navy' | 'light'
}

/**
 * SVY mark — an open book with the SVY monogram, recreated as inline SVG
 * from the brand logo so it scales crisply and inherits theme colours.
 * Server component (no interactivity), usable anywhere.
 */
export function Logo({ size = 36, withWordmark = true, className, variant = 'navy' }: LogoProps) {
  const stroke = variant === 'light' ? '#ffffff' : '#1e3a5f'
  const plate = variant === 'light' ? 'rgba(255,255,255,0.12)' : '#cfe2ee'

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        role="img"
        aria-label="SVY"
        className="shrink-0"
      >
        <rect width="64" height="64" rx="14" fill={plate} />
        <path
          d="M13 19c6-3.4 12.5-3.2 19 1 6.5-4.2 13-4.4 19-1v27c-6-3.4-12.5-3.2-19 1-6.5-4.2-13-4.4-19-1V19Z"
          stroke={stroke}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path d="M32 21v26" stroke={stroke} strokeWidth="2.6" />
        <path
          d="M19 33c3.5 1.4 7.5 1.6 11 .4M34 33.4c3.5-1.2 7.5-1 11 .4"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.6"
        />
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="800"
          fontSize="13"
          letterSpacing="0.5"
          fill={stroke}
        >
          SVY
        </text>
      </svg>
      {withWordmark && (
        <span className="font-display text-xl font-extrabold tracking-tight" style={{ color: stroke }}>
          SVY
        </span>
      )}
    </span>
  )
}

export default Logo
