import type { LucideIcon } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

export interface StatCardProps {
  /** Short metric label, e.g. "Tests completed". */
  label: string
  /** The headline figure, already formatted (e.g. "12", "78%", "—"). */
  value: string
  /** Supporting microcopy under the value. */
  hint?: string
  /** Lucide icon rendered in the tinted badge. */
  icon: LucideIcon
  className?: string
}

/**
 * Compact dashboard metric tile. Presentational only (no client state),
 * so it renders inside Server Components. Pass a Lucide icon component.
 */
export function StatCard({ label, value, hint, icon: Icon, className }: StatCardProps) {
  return (
    <Card hover className={cn('h-full', className)}>
      <CardBody className="flex h-full flex-col gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-navy-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-2xl font-extrabold leading-none text-navy-800 sm:text-3xl">
            {value}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-navy-600">{label}</p>
          {hint ? <p className="mt-1 text-xs text-navy-400">{hint}</p> : null}
        </div>
      </CardBody>
    </Card>
  )
}

export default StatCard
