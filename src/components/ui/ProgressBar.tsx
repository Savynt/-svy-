import { cn } from '@/lib/cn'
import { formatPercent } from '@/lib/format'

export function ProgressBar({
  value,
  className,
  showLabel = false,
}: {
  value: number
  className?: string
  showLabel?: boolean
}) {
  const v = formatPercent(value)
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-100">
        <div
          className={cn('h-full rounded-full transition-all', v === 100 ? 'bg-emerald-500' : 'bg-navy-600')}
          style={{ width: `${v}%` }}
        />
      </div>
      {showLabel && <span className="w-9 text-right text-xs font-semibold text-navy-500">{v}%</span>}
    </div>
  )
}

export default ProgressBar
