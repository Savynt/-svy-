'use client'

import { useTransition } from 'react'
import { useLocale } from '@/i18n/client'
import { LOCALE_LABELS, LOCALES, type Locale } from '@/i18n/locales'
import { setLocale } from '@/app/actions/set-locale'
import { cn } from '@/lib/cn'

const FLAG: Record<Locale, string> = {
  en: '🇬🇧',
  ru: '🇷🇺',
  uz: '🇺🇿',
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale()
  const [pending, startTransition] = useTransition()

  function handleChange(next: Locale) {
    if (next === locale) return
    startTransition(() => { setLocale(next) })
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => handleChange(l)}
          disabled={pending}
          aria-label={LOCALE_LABELS[l]}
          className={cn(
            'rounded-lg px-2 py-1 text-xs font-semibold transition-colors',
            l === locale
              ? 'bg-navy-100 text-navy-800'
              : 'text-navy-500 hover:bg-navy-50 hover:text-navy-700',
          )}
        >
          {FLAG[l]} {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
