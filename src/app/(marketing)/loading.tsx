import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/**
 * Marketing-zone Suspense fallback. Renders between the Navbar and Footer, so
 * it mirrors a typical inner page: a navy hero band → a grid of content cards.
 */
export default function MarketingLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      {/* Hero band (matches PageHero's navy gradient) */}
      <section className="bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600">
        <div className="container-app py-12 sm:py-16">
          <Skeleton shape="text" height={12} className="w-28 bg-white/20" />
          <Skeleton height={40} className="mt-3 w-80 max-w-full bg-white/20" />
          <div className="mt-4 max-w-2xl space-y-2">
            <Skeleton shape="text" height={14} className="w-full bg-white/15" />
            <Skeleton shape="text" height={14} className="w-2/3 bg-white/15" />
          </div>
        </div>
      </section>

      {/* Content cards */}
      <div className="container-app py-12 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-full">
              <CardBody className="flex h-full flex-col gap-4">
                <Skeleton shape="circle" className="h-11 w-11" />
                <Skeleton height={20} className="w-2/3" />
                <SkeletonText lines={3} />
                <Skeleton height={36} className="mt-2 w-32" />
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
