import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/**
 * Student-zone Suspense fallback. Mirrors the dashboard shell (header band →
 * stat grid → task list sections) so the layout doesn't jump when data lands.
 */
export default function StudentLoading() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard">
      {/* Header band */}
      <section className="border-b border-navy-100 bg-gradient-to-br from-white via-sky-50 to-sky-100">
        <div className="container-app py-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <Skeleton shape="text" height={12} className="w-24" />
              <Skeleton height={36} className="mt-3 w-72 max-w-full" />
              <SkeletonText lines={2} className="mt-4 max-w-md" />
            </div>
            <Skeleton height={32} width={120} className="rounded-full" />
          </div>
        </div>
      </section>

      <div className="container-app py-10">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-full">
              <CardBody className="flex h-full flex-col gap-3">
                <Skeleton shape="circle" className="h-10 w-10" />
                <Skeleton height={28} className="w-16" />
                <Skeleton shape="text" height={12} className="w-24" />
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Two task-list sections */}
        {Array.from({ length: 2 }).map((_, section) => (
          <section key={section} className="mt-12">
            <Skeleton shape="text" height={12} className="w-32" />
            <Skeleton height={24} className="mt-2 w-48" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 3 }).map((_, row) => (
                <Card key={row}>
                  <CardBody className="flex items-center gap-4">
                    <Skeleton shape="circle" className="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <Skeleton shape="text" height={14} className="w-2/3" />
                      <Skeleton shape="text" height={12} className="mt-2 w-1/3" />
                    </div>
                    <Skeleton height={32} width={80} className="hidden rounded-xl sm:block" />
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
