import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/**
 * Admin-zone Suspense fallback. Renders inside the admin layout's <main>, so it
 * only fills the content column: heading → stat grids → a table-ish block.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading admin console">
      {/* Heading */}
      <div className="max-w-xl">
        <Skeleton shape="text" height={12} className="w-24" />
        <Skeleton height={32} className="mt-3 w-72 max-w-full" />
        <SkeletonText lines={2} className="mt-4" />
      </div>

      {/* Two stat groups */}
      {Array.from({ length: 2 }).map((_, group) => (
        <section key={group}>
          <Skeleton height={20} className="mb-5 w-40" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-full">
                <CardBody className="flex h-full flex-col gap-3">
                  <Skeleton shape="circle" className="h-10 w-10" />
                  <Skeleton height={28} className="w-20" />
                  <Skeleton shape="text" height={12} className="w-24" />
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {/* List / table block */}
      <section>
        <Skeleton height={20} className="mb-5 w-44" />
        <Card>
          <CardBody className="divide-y divide-navy-100 p-0">
            {Array.from({ length: 5 }).map((_, row) => (
              <div key={row} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <Skeleton shape="circle" className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <Skeleton shape="text" height={13} className="w-1/2" />
                  <Skeleton shape="text" height={11} className="mt-2 w-1/3" />
                </div>
                <Skeleton height={24} width={72} className="hidden rounded-full sm:block" />
              </div>
            ))}
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
