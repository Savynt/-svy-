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
 * SVY mark — open book with SVY monogram, inline SVG matching brand identity.
 * Sky-blue background, dark-navy book frame, white sticker border.
 * Server component (no interactivity), usable anywhere.
 */
export function Logo({ size = 36, withWordmark = true, className, variant = 'navy' }: LogoProps) {
  const ink = variant === 'light' ? '#ffffff' : '#1e3a5f'
  const bg = variant === 'light' ? 'rgba(255,255,255,0.18)' : '#4dc3ee'
  const border = variant === 'light' ? 'rgba(255,255,255,0.35)' : '#ffffff'

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
        {/* White sticker border */}
        <rect width="64" height="64" rx="14" fill={border} />
        {/* Sky-blue plate */}
        <rect x="3" y="3" width="58" height="58" rx="11" fill={bg} />
        {/* Open book — top page arcs */}
        <path
          d="M9 27 C12 14 24 12 32 19 C40 12 52 14 55 27"
          stroke={ink}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Open book — bottom spine arc */}
        <path
          d="M9 49 C16 57 26 56 32 51 C38 56 48 57 55 49"
          stroke={ink}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Center spine */}
        <line x1="32" y1="19" x2="32" y2="51" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
        {/* Page rule lines */}
        <path
          d="M13 37 C19 39 25 39 31 37M33 37 C39 39 45 39 51 37"
          stroke={ink}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* SVY monogram — large and bold */}
        <text
          x="32"
          y="44"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Segoe UI', sans-serif"
          fontWeight="900"
          fontSize="17"
          letterSpacing="1"
          fill={ink}
        >
          SVY
        </text>
      </svg>
      {withWordmark && (
        <span className="font-display text-xl font-extrabold tracking-tight" style={{ color: ink }}>
          SVY
        </span>
      )}
    </span>
  )
}

export default Logo
