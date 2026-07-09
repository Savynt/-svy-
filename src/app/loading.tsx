import { Logo } from '@/components/Logo'
import { Spinner } from '@/components/ui/Spinner'

/**
 * Root Suspense fallback — shown while a fresh navigation streams in before a
 * more specific zone `loading.tsx` takes over. Branded, calm and centered.
 */
export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sky-50 px-6 text-center">
      <Logo size={48} />
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-navy-500">Loading Savynt…</p>
      </div>
    </div>
  )
}
