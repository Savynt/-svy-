import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/**
 * Coach-zone Suspense fallback. Renders inside the coach sidebar layout, so it
 * only fills the main content: heading → stat cards → task pipeline → two-up.
 */
export default function CoachLoading() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading coach overview">
      {/* Heading */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <Skeleton shape="text" height={12} className="w-28" />
          <Skeleton height={36} className="mt-3 w-80 max-w-full" />
          <SkeletonText lines={2} className="mt-4" />
        </div>
        <Skeleton height={48} width={160} className="shrink-0" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardBody className="flex h-full flex-col gap-3">
              <Skeleton shape="circle" className="h-10 w-10" />
              <Skeleton height={28} className="w-12" />
              <Skeleton shape="text" height={12} className="w-28" />
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Task pipeline */}
      <section>
        <Skeleton shape="text" height={12} className="w-24" />
        <Skeleton height={24} className="mt-2 w-44" />
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="h-full">
              <CardBody className="flex h-full flex-col gap-2">
                <Skeleton shape="circle" className="h-9 w-9" />
                <Skeleton height={28} className="w-10" />
                <Skeleton height={20} width={84} className="rounded-full" />
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Two-up: grading queue + students */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardBody className="space-y-4">
              <Skeleton height={20} className="w-40" />
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton shape="circle" className="h-9 w-9" />
                  <div className="flex-1">
                    <Skeleton shape="text" height={12} className="w-2/3" />
                    <Skeleton height={8} className="mt-2 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
