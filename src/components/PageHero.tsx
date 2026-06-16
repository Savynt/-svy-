import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

/**
 * Standard inner-page header band (navy gradient) with breadcrumbs.
 * Use it at the top of every section/skill page for a consistent look.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumbs = [],
  children,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  breadcrumbs?: Crumb[]
  children?: ReactNode
}) {
  return (
    <section className="bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600 text-white">
      <div className="container-app py-12 sm:py-16">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-sky-200">
            <Link href="/" className="rounded transition-colors hover:text-white">
              Home
            </Link>
            {breadcrumbs.map((c) => (
              <span key={c.label} className="flex items-center gap-1">
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 opacity-60" />
                {c.href ? (
                  <Link href={c.href} className="rounded transition-colors hover:text-white">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-white/90" aria-current="page">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-400">{eyebrow}</p>
        )}
        <h1 className="max-w-3xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl text-sky-100 sm:text-lg">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  )
}

export default PageHero
