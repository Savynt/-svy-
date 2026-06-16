import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

/**
 * Self-contained shimmer keyframes. We can't edit the shared Tailwind config
 * or globals.css, so the animation is injected once via a co-located <style>
 * element (server-renderable). React de-duplicates identical adjacent style
 * text across instances, and the keyframe name is namespaced to avoid clashes.
 */
const SHIMMER_CSS = `
@keyframes svy-skeleton-shimmer {
  100% { transform: translateX(100%); }
}
.svy-skeleton {
  position: relative;
  overflow: hidden;
  background-color: #e8f1f8; /* sky-100 base plate */
}
.svy-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(
    90deg,
    rgba(207, 226, 238, 0) 0,
    rgba(255, 255, 255, 0.55) 45%,
    rgba(174, 203, 225, 0.45) 55%,
    rgba(207, 226, 238, 0) 100%
  );
  animation: svy-skeleton-shimmer 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .svy-skeleton::after { animation: none; }
  .svy-skeleton { animation: svy-skeleton-pulse 1.8s ease-in-out infinite; }
  @keyframes svy-skeleton-pulse { 50% { opacity: 0.65; } }
}
`

type Shape = 'rect' | 'circle' | 'text'

const shapeClasses: Record<Shape, string> = {
  rect: 'rounded-xl',
  circle: 'rounded-full',
  text: 'rounded-md',
}

export interface SkeletonProps {
  className?: string
  /** Base geometry; `text` is a thin line, `circle` for avatars/badges. */
  shape?: Shape
  /** Inline width (e.g. '60%', 120). Prefer Tailwind classes when fixed. */
  width?: number | string
  /** Inline height (e.g. 16). Prefer Tailwind classes when fixed. */
  height?: number | string
}

/**
 * Sky/navy shimmer placeholder. Use inside `loading.tsx` Suspense fallbacks to
 * mirror the real layout. Decorative by default (aria-hidden) — wrap groups in
 * a container with an accessible `aria-busy`/status if you need announcements.
 */
export function Skeleton({ className, shape = 'rect', width, height }: SkeletonProps) {
  const style: CSSProperties = {}
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <span
        aria-hidden="true"
        style={style}
        className={cn('svy-skeleton block', shapeClasses[shape], className)}
      />
    </>
  )
}

/** A stack of text lines; the last line is shortened for a natural look. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <span className={cn('block space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          shape="text"
          height={12}
          className={i === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </span>
  )
}

export default Skeleton
